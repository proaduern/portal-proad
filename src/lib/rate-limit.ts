import crypto from 'crypto';
import prisma from './prisma';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

export async function verificarBloqueioLogin(identifier: string, ip: string): Promise<{
  bloqueado: boolean;
  minutosRestantes?: number;
}> {
  const idClean = identifier.trim().toLowerCase();
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT attempts, "lockedUntil", "lastAttemptAt"
       FROM portal.portal_login_attempts
       WHERE identifier = $1 AND ip = $2
       LIMIT 1`,
      idClean,
      ip
    );

    if (rows.length === 0) return { bloqueado: false };

    const record = rows[0];
    const now = Date.now();

    if (record.lockedUntil && new Date(record.lockedUntil).getTime() > now) {
      const msRestantes = new Date(record.lockedUntil).getTime() - now;
      return {
        bloqueado: true,
        minutosRestantes: Math.max(1, Math.ceil(msRestantes / 60000)),
      };
    }

    return { bloqueado: false };
  } catch {
    return { bloqueado: false };
  }
}

export async function registrarFalhaLogin(identifier: string, ip: string): Promise<{
  bloqueadoAgora: boolean;
  tentativasRestantes: number;
  minutosBloqueio?: number;
}> {
  const idClean = identifier.trim().toLowerCase();
  const now = new Date();
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, attempts, "lastAttemptAt"
       FROM portal.portal_login_attempts
       WHERE identifier = $1 AND ip = $2
       LIMIT 1`,
      idClean,
      ip
    );

    let newAttempts = 1;
    if (rows.length > 0) {
      const last = new Date(rows[0].lastAttemptAt).getTime();
      if (now.getTime() - last <= WINDOW_MS) {
        newAttempts = Number(rows[0].attempts) + 1;
      }
    }

    const lockedUntil =
      newAttempts >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCK_DURATION_MS) : null;

    if (rows.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE portal.portal_login_attempts
         SET attempts = $1, "lockedUntil" = $2, "lastAttemptAt" = $3
         WHERE id = $4`,
        newAttempts,
        lockedUntil,
        now,
        rows[0].id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO portal.portal_login_attempts (id, identifier, ip, attempts, "lockedUntil", "lastAttemptAt", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $6)`,
        crypto.randomUUID(),
        idClean,
        ip,
        newAttempts,
        lockedUntil,
        now
      );
    }

    if (lockedUntil) {
      // Log de segurança na auditoria central
      try {
        await prisma.logAuditoriaCentral.create({
          data: {
            sistema: 'PORTAL',
            acao: 'BLOQUEIO_TENTATIVAS_LOGIN',
            entidade: 'UsuarioCentral',
            entidadeNome: idClean,
            descricao: `Acesso bloqueado temporariamente por excesso de tentativas falhas (${newAttempts} tentativas em 15 min) a partir do IP ${ip}.`,
            usuarioEmail: idClean,
            ip,
          },
        });
      } catch {
        // Ignora erro de log
      }

      return {
        bloqueadoAgora: true,
        tentativasRestantes: 0,
        minutosBloqueio: 15,
      };
    }

    return {
      bloqueadoAgora: false,
      tentativasRestantes: Math.max(0, MAX_ATTEMPTS - newAttempts),
    };
  } catch {
    return { bloqueadoAgora: false, tentativasRestantes: MAX_ATTEMPTS };
  }
}

export async function limparTentativasLogin(identifier: string, ip: string): Promise<void> {
  const idClean = identifier.trim().toLowerCase();
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM portal.portal_login_attempts WHERE identifier = $1 AND ip = $2`,
      idClean,
      ip
    );
  } catch {
    // Ignora
  }
}
