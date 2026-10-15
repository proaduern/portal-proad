import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[Portal PROAD Treinamento] Solicitação de reset no Portal recebida.');
    // Conforme a arquitetura de RBAC Real para Treinamento:
    // O Portal Central PROAD é a autoridade de identidades reais e unidades oficiais (22 campi/faculdades).
    // Ele JAMAIS apaga unidades ou usuários reais cadastrados.
    // O treinamento opera através da identidade real de cada servidor/fornecedor,
    // isolando os dados de teste apenas nas tabelas de transação dos subsistemas.

    return NextResponse.json({
      success: true,
      mensagem:
        'Ambiente de treinamento pronto! As 22 unidades oficiais e os usuários homologados permanecem 100% seguros e preservados.',
    });
  } catch (err: any) {
    console.error('[Portal PROAD Treinamento] Erro no reset:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao processar reset de treinamento.' },
      { status: 500 }
    );
  }
}
