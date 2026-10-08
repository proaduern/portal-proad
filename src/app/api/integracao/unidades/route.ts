import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const serviceKey = process.env.PROAD_SERVICE_KEY || 'uern_proad_internal_service_key_2026';

    // Se fornecido header de autenticação, valida
    if (authHeader && authHeader !== `Bearer ${serviceKey}`) {
      return NextResponse.json({ error: 'Chave de serviço PROAD inválida.' }, { status: 401 });
    }

    const unidades = await prisma.unidadeCentral.findMany({
      where: { ativo: true },
      orderBy: [{ campus: 'asc' }, { sigla: 'asc' }],
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      origem: 'PORTAL_PROAD_CANONICAL',
      total: unidades.length,
      unidades,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao sincronizar unidades.' }, { status: 500 });
  }
}
