import { NextRequest, NextResponse } from 'next/server';
const { runSeedPortalTreinamento } = require('../../../../../prisma/seed-treinamento');

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[Portal PROAD Treinamento] Executando reset da base de treinamento...');
    await runSeedPortalTreinamento();

    return NextResponse.json({
      success: true,
      mensagem: 'Base de dados do Portal de Treinamento resetada com sucesso! Contas didáticas prontas para nova turma.',
    });
  } catch (err: any) {
    console.error('[Portal PROAD Treinamento] Erro no reset:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao resetar base de dados do portal de treinamento.' },
      { status: 500 }
    );
  }
}
