import { NextRequest, NextResponse } from 'next/server';
import { obterSessaoReal, iniciarAtuarComo, SessionPayload } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const realSession = await obterSessaoReal();
    const isAdmin =
      realSession &&
      (realSession.perfilSgc === 'ADMIN_PROAD' ||
        realSession.perfilManut === 'ADMIN' ||
        Boolean(realSession.perfilPca?.toUpperCase().includes('ADMIN')) ||
        realSession.email === 'adj.proad@uern.br' ||
        realSession.email === 'pedroreboucas@uern.br');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Apenas Administradores podem alternar perfis no Portal PROAD.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tipo, role, usuarioId, fornecedorCnpj, fornecedorNome } = body as {
      tipo?: 'ARQUETIPO' | 'FORNECEDOR' | 'USUARIO_REAL';
      role?: string;
      usuarioId?: string;
      fornecedorCnpj?: string;
      fornecedorNome?: string;
    };

    let payload: SessionPayload;

    if (tipo === 'FORNECEDOR' || role === 'FORNECEDOR') {
      const cnpj = fornecedorCnpj || '12.345.678/0001-90';
      const razao = fornecedorNome || 'AB Engenharia e Construções Ltda';
      payload = {
        id: `sim_fornecedor_${cnpj.replace(/\D/g, '')}`,
        nome: `Preposto - ${razao}`,
        email: 'preposto.externo@empresa.com.br',
        cpf: '000.000.000-00',
        tipoUsuario: 'FORNECEDOR_EXTERNO',
        status: 'ATIVO',
        cnpjEmpresa: cnpj,
        razaoSocial: razao,
        perfilSgc: 'FORNECEDOR',
        perfilManut: 'EMPRESA',
        perfilClimatizacao: 'EMPRESA',
      };
    } else {
      const primeiraUnidade = await prisma.unidadeCentral.findFirst({ orderBy: { sigla: 'asc' } });
      const roleAlvo = role || 'GESTOR';

      const mapPersonas: Record<string, Partial<SessionPayload>> = {
        GESTOR: {
          nome: 'Prof. Gestor de Contratos',
          perfilSgc: 'GESTOR',
          perfilManut: 'GESTOR_CONTRATO',
          perfilClimatizacao: 'GESTOR_CONTRATO',
        },
        FISCAL_ADMINISTRATIVO: {
          nome: 'Fiscal Administrativo (Conta Vinculada)',
          perfilSgc: 'FISCAL_ADMINISTRATIVO',
          perfilManut: 'FISCAL_ADM',
          perfilClimatizacao: 'FISCAL_ADM',
        },
        FISCAL_TECNICO: {
          nome: 'Fiscal Técnico Operacional',
          perfilSgc: 'FISCAL_TECNICO',
          perfilManut: 'FISCAL_TECNICO',
          perfilClimatizacao: 'FISCAL_TECNICO',
        },
        DEMANDANTE: {
          nome: 'Servidor Demandante da Unidade',
          perfilPca: 'UNIDADE',
          perfilManut: 'DEMANDANTE',
          perfilClimatizacao: 'DEMANDANTE',
          perfilDiarias: 'DEMANDANTE',
        },
        SETOR_TECNICO: {
          nome: 'Setor Técnico (SOBE / STI / Engenharia)',
          perfilPca: 'SETOR_TECNICO',
          perfilManut: 'TECNICO_SOBE',
          perfilClimatizacao: 'ENGENHARIA_SOBE',
        },
        LICITACOES: {
          nome: 'Diretor de Licitações (DLC)',
          perfilPca: 'LICITACOES',
        },
      };

      const preset = mapPersonas[roleAlvo] || mapPersonas.GESTOR;

      payload = {
        id: `sim_${roleAlvo.toLowerCase()}`,
        nome: preset.nome || `Simulação - ${roleAlvo}`,
        email: `sim.${roleAlvo.toLowerCase()}@uern.br`,
        cpf: '000.000.000-00',
        tipoUsuario: 'SERVIDOR_UERN',
        status: 'ATIVO',
        matricula: '010101-1',
        unidadeId: primeiraUnidade?.id || null,
        unidadeSigla: primeiraUnidade?.sigla || 'PROAD',
        unidadeNome: primeiraUnidade?.nome || 'Pró-Reitoria de Administração',
        ...preset,
      };
    }

    await iniciarAtuarComo(payload);

    return NextResponse.json({
      success: true,
      user: payload,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao iniciar simulação.' }, { status: 500 });
  }
}
