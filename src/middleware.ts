import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET_STRING =
  process.env.JWT_SECRET || 'uern_portal_proad_sso_master_key_2026_super_seguro';
const SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const COOKIE_NAME = 'portal_uern_session';

const PUBLIC_PAGES = ['/', '/credenciamento', '/pre-cadastro', '/verificar', '/treinamento'];
const PUBLIC_API_PREFIXES = [
  '/api/auth/google',
  '/api/auth/fornecedor',
  '/api/auth/pre-cadastro',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/unidades',
  '/api/integracao/',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (pathname.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado. Sessão obrigatória.' }, { status: 401 });
    }
    try {
      await jwtVerify(token, SECRET);
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
    }
  }

  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  if (!token && !isPublicPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (token && !isPublicPage) {
    try {
      await jwtVerify(token, SECRET);
    } catch {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
