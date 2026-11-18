import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const serviceKey = process.env.PROAD_SERVICE_KEY || 'proad_interop_internal_service_key_2026_uern';

    let autorizado = Boolean(authHeader && authHeader === `Bearer ${serviceKey}`);
    if (!autorizado) {
      const session = await getSession();
      autorizado = Boolean(session);
    }

    if (!autorizado) {
      return NextResponse.json({ error: 'Não autorizado. Chave de serviço PROAD ou sessão obrigatória.' }, { status: 401 });
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
