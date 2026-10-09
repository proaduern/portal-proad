import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PROAD_SERVICE_KEY = process.env.PROAD_SERVICE_KEY || 'proad_interop_internal_service_key_2026_uern';

function calcularCamposAlterados(antigo: any, novo: any): string[] {
  if (!antigo || !novo || typeof antigo !== 'object' || typeof novo !== 'object') {
    return [];
  }
  const chaves = Array.from(new Set([...Object.keys(antigo), ...Object.keys(novo)]));
  const alterados: string[] = [];

  for (const k of chaves) {
    // Ignorar chaves técnicas irrelevantes
    if (['atualizadoEm', 'updatedAt'].includes(k)) continue;
    const vAntigo = antigo[k];
    const vNovo = novo[k];

    const jsonAntigo = JSON.stringify(vAntigo);
    const jsonNovo = JSON.stringify(vNovo);

    if (jsonAntigo !== jsonNovo) {
      alterados.push(k);
    }
  }
  return alterados;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Permite via chave de serviço entre sistemas (PROAD_SERVICE_KEY) ou via sessão de usuário
    let isAuthorized = false;
    let sessionUser: any = null;

    if (token && token === PROAD_SERVICE_KEY) {
      isAuthorized = true;
    } else {
      sessionUser = await getSession();
      if (sessionUser) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Não autorizado. Chave de serviço ou sessão válida obrigatória.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      sistema = 'PORTAL',
      acao,
      entidade,
      entidadeId,
      entidadeNome,
      descricao,
      usuarioId,
      usuarioNome,
      usuarioEmail,
      usuarioRole,
      unidadeSigla,
      dadosAnteriores,
      dadosNovos,
      detalhes,
      rota,
    } = body;

    if (!acao || (!usuarioEmail && !sessionUser?.email)) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes (acao, usuarioEmail).' },
        { status: 400 }
      );
    }

    // IP e User Agent
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = body.ip || (forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '127.0.0.1');
    const userAgent = body.userAgent || request.headers.get('user-agent') || 'Desconhecido';

    // Determinar campos alterados (se não veio pronto no payload)
    let camposAlterados: string[] = body.camposAlterados || [];
    if ((!camposAlterados || camposAlterados.length === 0) && dadosAnteriores && dadosNovos) {
      camposAlterados = calcularCamposAlterados(dadosAnteriores, dadosNovos);
    }

    const emailFinal = usuarioEmail || sessionUser?.email || 'sistema@uern.br';
    const nomeFinal = usuarioNome || sessionUser?.nome || 'Operador do Sistema';
    const roleFinal = usuarioRole || sessionUser?.perfilSgc || sessionUser?.tipoUsuario || 'USUARIO';
    const unidadeFinal = unidadeSigla || sessionUser?.unidadeSigla || null;

    const log = await prisma.logAuditoriaCentral.create({
      data: {
        sistema: sistema.toUpperCase(),
        acao: acao.toUpperCase(),
        entidade: entidade || null,
        entidadeId: entidadeId ? String(entidadeId) : null,
        entidadeNome: entidadeNome || null,
        descricao: descricao || `${acao} em ${entidade || 'registro'}`,
        usuarioId: usuarioId || sessionUser?.id || null,
        usuarioNome: nomeFinal,
        usuarioEmail: emailFinal,
        usuarioRole: roleFinal,
        unidadeSigla: unidadeFinal,
        dadosAnteriores: dadosAnteriores ?? undefined,
        dadosNovos: dadosNovos ?? undefined,
        camposAlterados: camposAlterados || [],
        detalhes: detalhes ?? undefined,
        ip,
        userAgent,
        rota: rota || null,
      },
    });

    return NextResponse.json({ success: true, logId: log.id }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao registrar log de auditoria central:', error);
    return NextResponse.json(
      { error: 'Falha interna ao registrar auditoria.', details: error.message },
      { status: 500 }
    );
  }
}
