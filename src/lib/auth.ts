import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'uern_portal_proad_sso_master_key_2026_super_seguro';
const SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
export const COOKIE_NAME = 'portal_uern_session';
export const ADMIN_IMPERSONACAO_COOKIE_NAME = 'portal_admin_impersonacao';
const SESSION_MAX_AGE = 60 * 60 * 12; // 12 horas

export interface SessionPayload {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  tipoUsuario: 'SERVIDOR_UERN' | 'FORNECEDOR_EXTERNO';
  status: 'PENDENTE_APROVACAO' | 'DEVOLVIDO_CORRECAO' | 'ATIVO' | 'BLOQUEADO';
  matricula?: string | null;
  unidadeId?: string | null;
  unidadeSigla?: string | null;
  unidadeNome?: string | null;
  unidadeCampus?: string | null;
  cnpjEmpresa?: string | null;
  razaoSocial?: string | null;
  fotoUrl?: string | null;

  // Perfis nos sistemas
  perfilSgc?: string | null;
  perfilManut?: string | null;
  perfilPca?: string | null;
  permissoesPca?: any | null;
  perfilDiarias?: string | null;
  perfilClimatizacao?: string | null;
}

export async function hashPassword(pass: string): Promise<string> {
  return bcrypt.hash(pass, 10);
}

export async function verifyPassword(pass: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pass, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(SECRET);
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Retorna sempre a sesso real autenticada no cookie primrio do Portal.
 */
export async function obterSessaoReal(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Retorna a sesso ativa. Se for Administrador e houver cookie de simulao, retorna o usurio simulado.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const realSession = await obterSessaoReal();
    if (!realSession) return null;

    const isAdmin =
      Boolean(realSession.perfilSgc?.toUpperCase().includes('ADMIN_PROAD')) ||
      Boolean(realSession.perfilManut?.toUpperCase().includes('ADMIN')) ||
      Boolean(realSession.perfilPca?.toUpperCase().includes('ADMIN')) ||
      Boolean(realSession.perfilDiarias?.toUpperCase().includes('ADMIN')) ||
      Boolean(realSession.perfilClimatizacao?.toUpperCase().includes('ADMIN')) ||
      realSession.email === 'adj.proad@uern.br' ||
      realSession.email === 'pedroreboucas@uern.br';

    if (isAdmin) {
      const cookieStore = cookies();
      const impToken = cookieStore.get(ADMIN_IMPERSONACAO_COOKIE_NAME)?.value;
      if (impToken) {
        const { payload } = await jwtVerify(impToken, SECRET);
        if (payload) {
          return payload as unknown as SessionPayload;
        }
      }
    }

    return realSession;
  } catch {
    return null;
  }
}

export async function iniciarAtuarComo(payload: SessionPayload): Promise<void> {
  const realSession = await obterSessaoReal();
  const isAdmin =
    realSession &&
    (realSession.perfilSgc === 'ADMIN_PROAD' ||
      realSession.perfilManut === 'ADMIN' ||
      Boolean(realSession.perfilPca?.toUpperCase().includes('ADMIN')) ||
      realSession.perfilDiarias === 'ADMIN' ||
      realSession.perfilClimatizacao === 'ADMIN' ||
      realSession.email === 'adj.proad@uern.br' ||
      realSession.email === 'pedroreboucas@uern.br');

  if (!isAdmin) {
    throw new Error('Apenas Administradores PROAD podem utilizar a funcionalidade Atuar Como.');
  }

  const token = await createSessionToken(payload);
  const cookieStore = cookies();
  cookieStore.set(ADMIN_IMPERSONACAO_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas
  });
}

export async function encerrarAtuarComo(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(ADMIN_IMPERSONACAO_COOKIE_NAME);
}

export async function verifyAdminSession(): Promise<SessionPayload | null> {
  const session = await obterSessaoReal();
  if (!session) return null;

  const isAdmin =
    session.perfilSgc === 'ADMIN_PROAD' ||
    session.perfilManut === 'ADMIN' ||
    Boolean(session.perfilPca?.toUpperCase().includes('ADMIN')) ||
    session.perfilDiarias === 'ADMIN' ||
    session.perfilClimatizacao === 'ADMIN' ||
    session.email === 'adj.proad@uern.br' ||
    session.email === 'pedroreboucas@uern.br';

  if (!isAdmin) return null;
  return session;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(ADMIN_IMPERSONACAO_COOKIE_NAME);
  cookieStore.set(COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

/**
 * Gera um token de Single Sign-On (SSO) com expiração curta (2 minutos)
 * para transição segura de clique do Launcher para os sistemas de destino.
 */
export async function generateSsoToken(
  usuario: SessionPayload & { unidadeEmail?: string | null; perfisPca?: string | null },
  targetSystem: 'SGC' | 'MANUTENCAO' | 'PCA' | 'DIARIAS' | 'CLIMATIZACAO'
): Promise<string> {
  return new SignJWT({
    userId: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    cpf: usuario.cpf,
    matricula: usuario.matricula,
    unidadeId: usuario.unidadeId,
    unidadeSigla: usuario.unidadeSigla,
    unidadeNome: usuario.unidadeNome,
    unidadeEmail: usuario.unidadeEmail,
    cnpjEmpresa: usuario.cnpjEmpresa,
    razaoSocial: usuario.razaoSocial,
    targetSystem,
    role:
      targetSystem === 'SGC'
        ? usuario.perfilSgc
        : targetSystem === 'MANUTENCAO'
        ? usuario.perfilManut
        : targetSystem === 'PCA'
        ? usuario.perfilPca
        : targetSystem === 'DIARIAS'
        ? usuario.perfilDiarias
        : (usuario.perfilClimatizacao || (usuario.perfilSgc?.includes('ADMIN_PROAD') || usuario.perfilManut?.includes('ADMIN') ? 'ADMIN' : 'DEMANDANTE')),
    perfisPca: targetSystem === 'PCA' ? (usuario.perfisPca || usuario.perfilPca) : undefined,
    permissoesPca: targetSystem === 'PCA' ? usuario.permissoesPca : undefined,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2m')
    .sign(SECRET);
}
