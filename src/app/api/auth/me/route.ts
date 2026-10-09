import { NextRequest, NextResponse } from 'next/server';
import { getSession, clearSessionCookie } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // Busca dados atualizados no banco
    const userDb = await prisma.usuarioCentral.findUnique({
      where: { id: session.id },
      include: { unidade: true },
    });

    if (!userDb) {
      clearSessionCookie();
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
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
        motivoDevolucao: userDb.motivoDevolucao,
        dataDevolucao: userDb.dataDevolucao,
        isAdminGeral: userDb.perfilSgc === 'ADMIN_PROAD' || userDb.perfilManut === 'ADMIN' || userDb.perfilPca === 'ADMIN',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
