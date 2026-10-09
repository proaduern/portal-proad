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
          sistema: 'PORTAL',
          acao: 'BLOQUEIO',
          entidade: 'UsuarioCentral',
          entidadeId: id,
          entidadeNome: usuario.nome,
          descricao: `Homologação indeferida/bloqueada para ${usuario.nome} (${usuario.email}). Motivo: ${motivoRejeicao || 'Não informado'}`,
          usuarioId: admin.id,
          usuarioNome: admin.nome,
          usuarioEmail: admin.email,
          usuarioRole: admin.perfilSgc || 'ADMIN_PROAD',
          unidadeSigla: admin.unidadeSigla || 'PROAD',
          dadosAnteriores: { status: usuario.status },
          dadosNovos: { status: 'BLOQUEADO', motivoBloqueio: motivoRejeicao },
          camposAlterados: ['status', 'motivoBloqueio'],
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
        sistema: 'PORTAL',
        acao: 'HOMOLOGACAO',
        entidade: 'UsuarioCentral',
        entidadeId: id,
        entidadeNome: usuarioAprovado.nome,
        descricao: `Homologação e concessão de perfis para ${usuarioAprovado.nome} (${usuarioAprovado.email})`,
        usuarioId: admin.id,
        usuarioNome: admin.nome,
        usuarioEmail: admin.email,
        usuarioRole: admin.perfilSgc || 'ADMIN_PROAD',
        unidadeSigla: admin.unidadeSigla || 'PROAD',
        dadosAnteriores: {
          status: usuario.status,
          perfilSgc: usuario.perfilSgc,
          perfilManut: usuario.perfilManut,
          perfilPca: usuario.perfilPca,
          perfilDiarias: usuario.perfilDiarias,
        },
        dadosNovos: {
          status: 'ATIVO',
          perfilSgc: usuarioAprovado.perfilSgc,
          perfilManut: usuarioAprovado.perfilManut,
          perfilPca: usuarioAprovado.perfilPca,
          perfilDiarias: usuarioAprovado.perfilDiarias,
        },
        camposAlterados: ['status', 'perfilSgc', 'perfilManut', 'perfilPca', 'perfilDiarias'],
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
