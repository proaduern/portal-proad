import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminSession();
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores e auditores da PROAD podem visualizar logs.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sistema = searchParams.get('sistema')?.trim().toUpperCase() || '';
    const acao = searchParams.get('acao')?.trim().toUpperCase() || '';
    const entidade = searchParams.get('entidade')?.trim() || '';
    const q = searchParams.get('q')?.trim() || '';
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(5, parseInt(searchParams.get('pageSize') || '25', 10)));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (sistema && sistema !== 'TODOS') {
      where.sistema = sistema;
    }

    if (acao && acao !== 'TODAS') {
      where.acao = acao;
    }

    if (entidade) {
      where.entidade = { contains: entidade, mode: 'insensitive' };
    }

    if (q) {
      where.OR = [
        { usuarioNome: { contains: q, mode: 'insensitive' } },
        { usuarioEmail: { contains: q, mode: 'insensitive' } },
        { entidadeNome: { contains: q, mode: 'insensitive' } },
        { descricao: { contains: q, mode: 'insensitive' } },
        { entidadeId: { contains: q, mode: 'insensitive' } },
        { rota: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (dataInicio || dataFim) {
      where.criadoEm = {};
      if (dataInicio) {
        where.criadoEm.gte = new Date(dataInicio);
      }
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        where.criadoEm.lte = fim;
      }
    }

    // Contagem e dados paginados
    const [total, logs] = await Promise.all([
      prisma.logAuditoriaCentral.count({ where }),
      prisma.logAuditoriaCentral.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    // Métricas gerais para o cabeçalho do painel
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);

    const [totalGeral, hojeCount, sistemaGroups] = await Promise.all([
      prisma.logAuditoriaCentral.count(),
      prisma.logAuditoriaCentral.count({
        where: { criadoEm: { gte: inicioHoje } },
      }),
      prisma.logAuditoriaCentral.groupBy({
        by: ['sistema'],
        _count: { id: true },
      }),
    ]);

    const contagemPorSistema: Record<string, number> = {
      PORTAL: 0,
      SGC: 0,
      PCA: 0,
      MANUTENCAO: 0,
      DIARIAS: 0,
    };

    sistemaGroups.forEach((item) => {
      contagemPorSistema[item.sistema] = item._count.id;
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      metricas: {
        totalGeral,
        hojeCount,
        contagemPorSistema,
      },
    });
  } catch (error: any) {
    console.error('Erro ao consultar logs de auditoria:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar logs de auditoria.', details: error.message },
      { status: 500 }
    );
  }
}
