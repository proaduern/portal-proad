import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado. Requer perfil de Administrador da PROAD.' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      decisao, // 'APROVAR' | 'REJEITAR'
      motivoRejeicao,
      perfilSgc,
      perfilManut,
      perfilPca,
      permissoesPca,
      perfilDiarias,
      unidadeId, // Permite ao admin ajustar a unidade do servidor se necessário
    } = body;

    const usuario = await prisma.usuarioCentral.findUnique({
      where: { id },
      include: { unidade: true },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não localizado.' }, { status: 404 });
    }

    if (decisao === 'REJEITAR') {
      const usuarioBloqueado = await prisma.usuarioCentral.update({
        where: { id },
        data: {
          status: 'BLOQUEADO',
          motivoBloqueio: motivoRejeicao || 'Cadastro não homologado pela administração da PROAD.',
          aprovadoEm: new Date(),
          aprovadoPor: admin.email,
        },
      });

      await prisma.logAuditoriaCentral.create({
        data: {
          usuarioId: admin.id,
          usuarioEmail: admin.email,
          acao: 'HOMOLOGACAO_REJEITADA',
          detalhes: {
            alvoEmail: usuario.email,
            motivo: motivoRejeicao,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Cadastro de ${usuario.nome} foi indeferido/bloqueado.`,
        usuario: usuarioBloqueado,
      });
    }

    // Fluxo de Aprovação:
    // Pelo menos 1 perfil em algum sistema deve ser concedido (ou perfil padrao para fornecedor)
    const usuarioAprovado = await prisma.usuarioCentral.update({
      where: { id },
      data: {
        status: 'ATIVO',
        motivoBloqueio: null,
        aprovadoEm: new Date(),
        aprovadoPor: admin.email,
        unidadeId: unidadeId !== undefined ? (unidadeId || null) : usuario.unidadeId,
        perfilSgc: perfilSgc || null,
        perfilManut: perfilManut || null,
        perfilPca: perfilPca || null,
        permissoesPca: permissoesPca || null,
        perfilDiarias: perfilDiarias || null,
      },
      include: { unidade: true },
    });

    await prisma.logAuditoriaCentral.create({
      data: {
        usuarioId: admin.id,
        usuarioEmail: admin.email,
        acao: 'HOMOLOGACAO_APROVADA',
        detalhes: {
          alvoId: id,
          alvoEmail: usuarioAprovado.email,
          alvoNome: usuarioAprovado.nome,
          perfilSgc: usuarioAprovado.perfilSgc,
          perfilManut: usuarioAprovado.perfilManut,
          perfilPca: usuarioAprovado.perfilPca,
          perfilDiarias: usuarioAprovado.perfilDiarias,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cadastro de ${usuarioAprovado.nome} homologado com sucesso!`,
      usuario: usuarioAprovado,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao processar homologação.' }, { status: 500 });
  }
}
