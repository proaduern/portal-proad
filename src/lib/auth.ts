import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'uern_portal_proad_sso_master_key_2026_super_seguro';
const SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const COOKIE_NAME = 'portal_uern_session';
const SESSION_MAX_AGE = 60 * 60 * 12; // 12 horas

export interface SessionPayload {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  tipoUsuario: 'SERVIDOR_UERN' | 'FORNECEDOR_EXTERNO';
  status: 'PENDENTE_APROVACAO' | 'ATIVO' | 'BLOQUEADO';
  matricula?: string | null;
  unidadeId?: string | null;
  unidadeSigla?: string | null;
  unidadeNome?: string | null;
  cnpjEmpresa?: string | null;
  razaoSocial?: string | null;
  fotoUrl?: string | null;

  // Perfis nos sistemas
  perfilSgc?: string | null;
  perfilManut?: string | null;
  perfilPca?: string | null;
  permissoesPca?: any | null;
  perfilDiarias?: string | null;
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

export async function getSession(): Promise<SessionPayload | null> {
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

export async function verifyAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;

  const isAdmin =
    session.perfilSgc === 'ADMIN_PROAD' ||
    session.perfilManut === 'ADMIN' ||
    session.perfilPca === 'ADMIN' ||
    session.perfilDiarias === 'ADMIN' ||
    session.email === 'adj.proad@uern.br';

  if (!isAdmin) return null;
  return session;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Gera um token de Single Sign-On (SSO) com expiração curta (2 minutos)
 * para transição segura de clique do Launcher para os sistemas de destino.
 */
export async function generateSsoToken(usuario: SessionPayload, targetSystem: 'SGC' | 'MANUTENCAO' | 'PCA' | 'DIARIAS'): Promise<string> {
  return new SignJWT({
    userId: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    cpf: usuario.cpf,
    matricula: usuario.matricula,
    unidadeId: usuario.unidadeId,
    unidadeSigla: usuario.unidadeSigla,
    targetSystem,
    role:
      targetSystem === 'SGC'
        ? usuario.perfilSgc
        : targetSystem === 'MANUTENCAO'
        ? usuario.perfilManut
        : targetSystem === 'PCA'
        ? usuario.perfilPca
        : usuario.perfilDiarias,
    permissoesPca: targetSystem === 'PCA' ? usuario.permissoesPca : undefined,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2m')
    .sign(SECRET);
}
