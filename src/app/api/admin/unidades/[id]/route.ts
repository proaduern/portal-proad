import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado. Requer perfil de Administrador.' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { sigla, nome, campus, codigo, email, telefone, predioNome, ativo } = body;

    const unidadeExistente = await prisma.unidadeCentral.findUnique({
      where: { id },
    });

    if (!unidadeExistente) {
      return NextResponse.json({ error: 'Unidade não encontrada.' }, { status: 404 });
    }

    // Se alterou sigla, checa duplicidade
    if (sigla && sigla.trim().toUpperCase() !== unidadeExistente.sigla) {
      const siglaDuplicada = await prisma.unidadeCentral.findUnique({
        where: { sigla: sigla.trim().toUpperCase() },
      });
      if (siglaDuplicada) {
        return NextResponse.json(
          { error: `A sigla "${sigla.trim().toUpperCase()}" já está em uso por outra unidade.` },
          { status: 409 }
        );
      }
    }

    const unidadeAtualizada = await prisma.unidadeCentral.update({
      where: { id },
      data: {
        sigla: sigla ? sigla.trim().toUpperCase() : undefined,
        nome: nome ? nome.trim() : undefined,
        campus: campus ? campus.trim() : undefined,
        codigo: codigo !== undefined ? (codigo ? codigo.trim() : null) : undefined,
        email: email !== undefined ? (email ? email.trim().toLowerCase() : null) : undefined,
        telefone: telefone !== undefined ? (telefone ? telefone.trim() : null) : undefined,
        predioNome: predioNome !== undefined ? (predioNome ? predioNome.trim() : null) : undefined,
        ativo: ativo !== undefined ? Boolean(ativo) : undefined,
      },
    });

    await prisma.logAuditoriaCentral.create({
      data: {
        usuarioId: admin.id,
        usuarioEmail: admin.email,
        acao: 'ATUALIZAR_UNIDADE',
        detalhes: { unidadeId: id, sigla: unidadeAtualizada.sigla },
      },
    });

    return NextResponse.json({ success: true, unidade: unidadeAtualizada });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar unidade.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado. Requer perfil de Administrador.' }, { status: 403 });
    }

    const { id } = params;

    const unidade = await prisma.unidadeCentral.findUnique({
      where: { id },
      include: { _count: { select: { usuarios: true } } },
    });

    if (!unidade) {
      return NextResponse.json({ error: 'Unidade não encontrada.' }, { status: 404 });
    }

    if (unidade._count.usuarios > 0) {
      // Se possui usuários vinculados, desativa ao invés de deletar para manter integridade
      await prisma.unidadeCentral.update({
        where: { id },
        data: { ativo: false },
      });
      return NextResponse.json({
        success: true,
        message: `A unidade "${unidade.sigla}" possui ${unidade._count.usuarios} usuário(s) vinculado(s) e foi desativada em vez de excluída.`,
      });
    }

    await prisma.unidadeCentral.delete({
      where: { id },
    });

    await prisma.logAuditoriaCentral.create({
      data: {
        usuarioId: admin.id,
        usuarioEmail: admin.email,
        acao: 'EXCLUIR_UNIDADE',
        detalhes: { unidadeId: id, sigla: unidade.sigla },
      },
    });

    return NextResponse.json({ success: true, message: `Unidade ${unidade.sigla} excluída com sucesso.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao excluir unidade.' }, { status: 500 });
  }
}
