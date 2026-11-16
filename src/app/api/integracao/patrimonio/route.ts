import { NextRequest, NextResponse } from 'next/server';
import { ITENS_PATRIMONIO_INICIAIS, PROCESSOS_AQUISICAO_INICIAIS } from '@/data/patrimonioData';

export const dynamic = 'force-dynamic';

// GET: Retorna dados analíticos consolidados de estoque, liberações e processos de compra
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campus = searchParams.get('campus');
    const origem = searchParams.get('origem'); // PROAD, OP_CONVENIOS, CONSUMO

    let itens = [...ITENS_PATRIMONIO_INICIAIS];

    if (origem) {
      itens = itens.filter((i) => i.origem === origem);
    }

    if (campus) {
      itens = itens.filter(
        (i) =>
          i.destinoInicial.toLowerCase().includes(campus.toLowerCase()) ||
          i.liberacoes.some((l) => l.destino.toLowerCase().includes(campus.toLowerCase()))
      );
    }

    const totalEstoquePecas = itens.reduce((acc, i) => acc + i.saldo, 0);
    const totalValor = itens.reduce((acc, i) => acc + i.saldo * i.valorUnitario, 0);

    return NextResponse.json({
      sucesso: true,
      totalItens: itens.length,
      totalEstoquePecas,
      totalValor,
      processosCompraAtivos: PROCESSOS_AQUISICAO_INICIAIS.length,
      itens,
    });
  } catch (err: any) {
    return NextResponse.json({ sucesso: false, error: err.message }, { status: 500 });
  }
}

// POST: Recebe eventos disparados pelo SGC (TRP, TRD ou Envio ao Demandante)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipoEvento, processoSei, itemDescricao, quantidade, destino, termoNumero, guiaNumero } = body;

    // Log institucional de recebimento de evento do SGC
    console.log(`[INTEGRAÇÃO SGC -> PATRIMÔNIO] Evento: ${tipoEvento} | Processo: ${processoSei}`);

    return NextResponse.json({
      sucesso: true,
      mensagem: `Evento ${tipoEvento} processado no Controle de Estoque e Entregas do Patrimônio.`,
      detalhes: {
        tipoEvento,
        processoSei,
        itemDescricao,
        quantidade,
        destino,
        termoNumero: termoNumero || 'Pendente de numeração',
        guiaNumero: guiaNumero || 'Pendente de numeração',
        statusEstoque:
          tipoEvento === 'RECEBIMENTO_PROVISORIO_TRP'
            ? 'EM_CONFERENCIA_QUARNTENA'
            : tipoEvento === 'RECEBIMENTO_DEFINITIVO_TRD'
            ? 'INCORPORADO_DISPONIVEL'
            : 'BAIXADO_ENVIADO_CAMPUS',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ sucesso: false, error: err.message }, { status: 500 });
  }
}
