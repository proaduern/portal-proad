import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado. Requer perfil de Administrador.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim() || '';
    const apenasAtivas = searchParams.get('ativas') === 'true';

    const where: any = {};
    if (apenasAtivas) {
      where.ativo = true;
    }
    if (search) {
      where.OR = [
        { sigla: { contains: search, mode: 'insensitive' } },
        { nome: { contains: search, mode: 'insensitive' } },
        { campus: { contains: search, mode: 'insensitive' } },
      ];
    }

    const unidades = await prisma.unidadeCentral.findMany({
      where,
      orderBy: [{ campus: 'asc' }, { sigla: 'asc' }],
      include: {
        _count: {
          select: { usuarios: true },
        },
      },
    });

    return NextResponse.json({ unidades });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao listar unidades.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado. Requer perfil de Administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { sigla, nome, campus, codigo, email, telefone, predioNome } = body;

    if (!sigla || !nome || !campus) {
      return NextResponse.json({ error: 'Sigla, Nome e Campus são campos obrigatórios.' }, { status: 400 });
    }

    const siglaLimpa = sigla.trim().toUpperCase();

    const existeSigla = await prisma.unidadeCentral.findUnique({
      where: { sigla: siglaLimpa },
    });

    if (existeSigla) {
      return NextResponse.json({ error: `Já existe uma unidade cadastrada com a sigla "${siglaLimpa}".` }, { status: 409 });
    }

    const novaUnidade = await prisma.unidadeCentral.create({
      data: {
        sigla: siglaLimpa,
        nome: nome.trim(),
        campus: campus.trim(),
        codigo: codigo ? codigo.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        telefone: telefone ? telefone.trim() : null,
        predioNome: predioNome ? predioNome.trim() : null,
        ativo: true,
      },
    });

    await prisma.logAuditoriaCentral.create({
      data: {
        usuarioId: admin.id,
        usuarioEmail: admin.email,
        acao: 'CRIAR_UNIDADE',
        detalhes: { unidadeId: novaUnidade.id, sigla: novaUnidade.sigla, nome: novaUnidade.nome },
      },
    });

    return NextResponse.json({ success: true, unidade: novaUnidade }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao cadastrar unidade.' }, { status: 500 });
  }
}
