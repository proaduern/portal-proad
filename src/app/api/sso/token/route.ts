import { NextRequest, NextResponse } from 'next/server';
import { getSession, generateSsoToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const VALID_SYSTEMS = [
  'SGC',
  'MANUTENCAO',
  'PCA',
  'ETP_RISCOS',
  'PESQUISA_PRECOS',
  'TERMO_REFERENCIA',
  'LICITACOES_MINUTAS',
  'DIARIAS',
  'CLIMATIZACAO',
] as const;

type TargetSystemType = (typeof VALID_SYSTEMS)[number];

const PRE_CONTRATUAL_SYSTEMS: TargetSystemType[] = [
  'PCA',
  'ETP_RISCOS',
  'PESQUISA_PRECOS',
  'TERMO_REFERENCIA',
  'LICITACOES_MINUTAS',
];

function hasSubsistemaAccess(
  perfilPca: string | null | undefined,
  isAdminGeral: boolean,
  target: string
): string | null {
  if (isAdminGeral || perfilPca?.toUpperCase().includes('ADMIN')) {
    return 'ADMIN';
  }
  const roles = (perfilPca || '')
    .toUpperCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (roles.length === 0) return null;

  if (target === 'PCA') {
    const match = roles.find((r) =>
      ['UNIDADE', 'DEMANDANTE', 'DIRETOR_UNIDADE', 'SETOR_INTERNO', 'SERVIDOR_UNIDADE', 'PCA'].includes(r)
    );
    if (match) return match;
  } else if (target === 'ETP_RISCOS') {
    if (roles.some((r) => ['SETOR_TECNICO', 'ETP', 'ETP_RISCOS'].includes(r))) {
      return 'SETOR_TECNICO';
    }
  } else if (target === 'PESQUISA_PRECOS') {
    if (roles.some((r) => ['PESQUISA_PRECOS', 'PESQUISA'].includes(r))) {
      return 'PESQUISA_PRECOS';
    }
  } else if (target === 'TERMO_REFERENCIA') {
    if (roles.some((r) => ['PLANEJAMENTO', 'TERMO_REFERENCIA', 'TR'].includes(r))) {
      return 'PLANEJAMENTO';
    }
  } else if (target === 'LICITACOES_MINUTAS') {
    const match = roles.find((r) =>
      ['LICITACOES', 'AGENTE_CONTRATACAO', 'GESTOR_ATA', 'CONTRATOS', 'MINUTAS'].includes(r)
    );
    if (match) return match;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada ou não autenticada.' }, { status: 401 });
    }

    if (session.status !== 'ATIVO') {
      return NextResponse.json(
        { error: 'Seu cadastro ainda não está ativo ou aguarda homologação da PROAD.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetSystem, isTreinamento } = body as {
      targetSystem: TargetSystemType;
      isTreinamento?: boolean;
    };

    if (!targetSystem || !VALID_SYSTEMS.includes(targetSystem)) {
      return NextResponse.json({ error: 'Sistema de destino inválido.' }, { status: 400 });
    }

    // Busca usuário atualizado
    const userDb = await prisma.usuarioCentral.findUnique({
      where: { id: session.id },
      include: { unidade: true },
    });

    if (!userDb || userDb.status !== 'ATIVO') {
      return NextResponse.json({ error: 'Usuário não habilitado para acesso.' }, { status: 403 });
    }

    const isAdminGeral =
      userDb.perfilSgc === 'ADMIN_PROAD' ||
      userDb.perfilManut === 'ADMIN' ||
      Boolean(userDb.perfilPca?.toUpperCase().includes('ADMIN')) ||
      (userDb as any).perfilClimatizacao === 'ADMIN';

    // Verifica se possui permissão no sistema de destino
    let roleForSystem: string | null = null;
    let systemBaseUrl = '';

    if (targetSystem === 'SGC') {
      roleForSystem = userDb.perfilSgc || (isAdminGeral ? 'ADMIN_PROAD' : null);
      systemBaseUrl = process.env.SGC_URL || 'http://localhost:3000';
    } else if (targetSystem === 'MANUTENCAO') {
      roleForSystem = userDb.perfilManut || (isAdminGeral ? 'ADMIN' : null);
      systemBaseUrl = process.env.MANUTENCAO_URL || 'http://localhost:3003';
    } else if (PRE_CONTRATUAL_SYSTEMS.includes(targetSystem)) {
      roleForSystem = hasSubsistemaAccess(userDb.perfilPca, isAdminGeral, targetSystem);
      systemBaseUrl = process.env.PCA_URL || 'http://localhost:3002';
    } else if (targetSystem === 'DIARIAS') {
      roleForSystem = userDb.perfilDiarias || (isAdminGeral ? 'ADMIN' : null);
      systemBaseUrl = process.env.DIARIAS_URL || 'http://localhost:3004';
    } else if (targetSystem === 'CLIMATIZACAO') {
      roleForSystem =
        (userDb as any).perfilClimatizacao ||
        (isAdminGeral ? 'ADMIN' : null);
      const rawClimaUrl = process.env.CLIMATIZACAO_URL || 'http://localhost:3005';
      systemBaseUrl = rawClimaUrl.includes('climatizacao.vercel.app')
        ? 'https://climatizacao-proaduern.vercel.app'
        : rawClimaUrl;
    }

    if (!roleForSystem) {
      return NextResponse.json(
        {
          error: `Você não possui perfil de acesso autorizado para o sistema ${targetSystem}. Solicite autorização à PROAD para poder acessar ou treinar neste subsistema.`,
        },
        { status: 403 }
      );
    }

    const isPreContratual = PRE_CONTRATUAL_SYSTEMS.includes(targetSystem);
    const jwtTargetSystem = isPreContratual
      ? 'PCA'
      : (targetSystem as 'SGC' | 'MANUTENCAO' | 'PCA' | 'DIARIAS' | 'CLIMATIZACAO');

    // Cria token seguro de salto SSO
    const ssoToken = await generateSsoToken(
      {
        id: userDb.id,
        nome: userDb.nome,
        email: userDb.email,
        cpf: userDb.cpf,
        tipoUsuario: userDb.tipoUsuario,
        status: userDb.status,
        matricula: userDb.matricula,
        unidadeId: userDb.unidadeId,
        unidadeSigla: userDb.unidade?.sigla,
        unidadeNome: userDb.unidade?.nome,
        unidadeEmail: userDb.unidade?.email,
        cnpjEmpresa: userDb.cnpjEmpresa,
        razaoSocial: userDb.razaoSocial,
        perfilSgc: userDb.perfilSgc,
        perfilManut: userDb.perfilManut,
        perfilPca: isPreContratual ? roleForSystem : userDb.perfilPca,
        permissoesPca: userDb.permissoesPca,
        perfilDiarias: userDb.perfilDiarias,
        perfilClimatizacao: (userDb as any).perfilClimatizacao,
      },
      jwtTargetSystem
    );

    const subsistemaParam = isPreContratual ? `&subsistema=${targetSystem}` : '';

    const redirectUrl = isTreinamento
      ? `${systemBaseUrl}/api/auth/sso-callback?token=${encodeURIComponent(ssoToken)}&treinamento=1${subsistemaParam}`
      : `${systemBaseUrl}/api/auth/sso-callback?token=${encodeURIComponent(ssoToken)}${subsistemaParam}`;

    return NextResponse.json({
      success: true,
      targetSystem,
      role: roleForSystem,
      token: ssoToken,
      redirectUrl,
      isTreinamento: Boolean(isTreinamento),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao gerar token SSO.' }, { status: 500 });
  }
}
