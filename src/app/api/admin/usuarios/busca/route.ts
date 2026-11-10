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
    const q = searchParams.get('q')?.trim() || '';

    const where: any = {
      status: 'ATIVO',
    };

    if (q) {
      where.OR = [
        { nome: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { matricula: { contains: q } },
        { cpf: { contains: q } },
        { cnpjEmpresa: { contains: q } },
        { razaoSocial: { contains: q, mode: 'insensitive' } },
        { nomeFantasia: { contains: q, mode: 'insensitive' } },
      ];
    }

    const usuarios = await prisma.usuarioCentral.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        matricula: true,
        tipoUsuario: true,
        status: true,
        unidadeId: true,
        unidade: {
          select: {
            id: true,
            sigla: true,
            nome: true,
            campus: true,
          },
        },
        cnpjEmpresa: true,
        razaoSocial: true,
        perfilSgc: true,
        perfilManut: true,
        perfilPca: true,
        perfilDiarias: true,
        perfilClimatizacao: true,
      },
      orderBy: { nome: 'asc' },
      take: 20,
    });

    return NextResponse.json({ usuarios });
  } catch (err: any) {
    console.error('Erro ao buscar usuários ativos:', err);
    return NextResponse.json({ error: err.message || 'Erro ao buscar usuários.' }, { status: 500 });
  }
}
