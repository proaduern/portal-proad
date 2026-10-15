import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
    }

    const usuario = await prisma.usuarioCentral.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { unidade: true },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuário didático não encontrado. Certifique-se de executar o seed de treinamento.' },
        { status: 404 }
      );
    }

    await setSessionCookie({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      tipoUsuario: usuario.tipoUsuario,
      status: usuario.status,
      matricula: usuario.matricula,
      unidadeId: usuario.unidadeId,
      unidadeSigla: usuario.unidade?.sigla,
      unidadeNome: usuario.unidade?.nome,
      cnpjEmpresa: usuario.cnpjEmpresa,
      razaoSocial: usuario.razaoSocial,
      perfilSgc: usuario.perfilSgc,
      perfilManut: usuario.perfilManut,
      perfilPca: usuario.perfilPca,
      permissoesPca: usuario.permissoesPca,
      perfilDiarias: usuario.perfilDiarias,
      perfilClimatizacao: (usuario as any).perfilClimatizacao,
    });

    return NextResponse.json({
      success: true,
      user: {
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipoUsuario,
      },
      redirect: '/hub',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
