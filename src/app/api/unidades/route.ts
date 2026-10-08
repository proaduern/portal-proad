import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const unidades = await prisma.unidadeCentral.findMany({
      where: { ativo: true },
      orderBy: [{ campus: 'asc' }, { sigla: 'asc' }],
      select: {
        id: true,
        sigla: true,
        nome: true,
        campus: true,
        predioNome: true,
      },
    });

    return NextResponse.json({ unidades });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao carregar unidades.' }, { status: 500 });
  }
}
