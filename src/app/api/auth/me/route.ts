import { NextRequest, NextResponse } from 'next/server';
import { getSession, obterSessaoReal, clearSessionCookie } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    const realSession = await obterSessaoReal();

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const isSimulacao = session.id.startsWith('sim_');
    const userDb = isSimulacao
      ? null
      : await prisma.usuarioCentral.findUnique({
          where: { id: session.id },
          include: { unidade: true },
        });

    if (!userDb && !isSimulacao) {
      clearSessionCookie();
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const activeUser = userDb
      ? {
          id: userDb.id,
          nome: userDb.nome,
          email: userDb.email,
          cpf: userDb.cpf,
          matricula: userDb.matricula,
          tipoUsuario: userDb.tipoUsuario,
          status: userDb.status,
          fotoUrl: userDb.fotoUrl,
          telefone: userDb.telefone,
          unidadeId: userDb.unidadeId,
          unidadeSigla: userDb.unidade?.sigla,
          unidadeNome: userDb.unidade?.nome,
          unidadeCampus: userDb.unidade?.campus,
          cnpjEmpresa: userDb.cnpjEmpresa,
          razaoSocial: userDb.razaoSocial,
          nomeFantasia: userDb.nomeFantasia,
          cargoPreposto: userDb.cargoPreposto,
          perfilSgc: userDb.perfilSgc,
          perfilManut: userDb.perfilManut,
          perfilPca: userDb.perfilPca,
          permissoesPca: userDb.permissoesPca,
          perfilDiarias: userDb.perfilDiarias,
          perfilClimatizacao:
            (userDb as any).perfilClimatizacao ||
            (userDb.perfilSgc?.toUpperCase().includes('ADMIN_PROAD') || userDb.perfilManut?.toUpperCase().includes('ADMIN') ? 'ADMIN' : null),
          motivoDevolucao: userDb.motivoDevolucao,
          dataDevolucao: userDb.dataDevolucao,
          isAdminGeral:
            Boolean(userDb.perfilSgc?.toUpperCase().includes('ADMIN_PROAD')) ||
            Boolean(userDb.perfilManut?.toUpperCase().includes('ADMIN')) ||
            Boolean(userDb.perfilPca?.toUpperCase().includes('ADMIN')) ||
            Boolean((userDb as any).perfilClimatizacao?.toUpperCase().includes('ADMIN')),
        }
      : {
          id: session.id,
          nome: session.nome,
          email: session.email,
          cpf: session.cpf,
          matricula: session.matricula,
          tipoUsuario: session.tipoUsuario,
          status: 'ATIVO',
          fotoUrl: null,
          telefone: null,
          unidadeId: session.unidadeId,
          unidadeSigla: session.unidadeSigla,
          unidadeNome: session.unidadeNome,
          unidadeCampus: session.unidadeCampus,
          cnpjEmpresa: session.cnpjEmpresa,
          razaoSocial: session.razaoSocial,
          nomeFantasia: session.razaoSocial,
          cargoPreposto: null,
          perfilSgc: session.perfilSgc,
          perfilManut: session.perfilManut,
          perfilPca: session.perfilPca,
          permissoesPca: session.permissoesPca,
          perfilDiarias: session.perfilDiarias,
          perfilClimatizacao: session.perfilClimatizacao,
          isAdminGeral: false,
        };

    const isAdminReal =
      Boolean(realSession?.perfilSgc?.toUpperCase().includes('ADMIN_PROAD')) ||
      Boolean(realSession?.perfilManut?.toUpperCase().includes('ADMIN')) ||
      Boolean(realSession?.perfilPca?.toUpperCase().includes('ADMIN')) ||
      realSession?.email === 'adj.proad@uern.br' ||
      realSession?.email === 'pedroreboucas@uern.br';

    return NextResponse.json({
      authenticated: true,
      user: activeUser,
      realUser: realSession,
      isImpersonando: Boolean(
        isAdminReal && (session.id !== realSession?.id || session.id.startsWith('sim_'))
      ),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
