import { NextRequest, NextResponse } from 'next/server';
import { getSession, generateSsoToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
    const { targetSystem } = body as { targetSystem: 'SGC' | 'MANUTENCAO' | 'PCA' | 'DIARIAS' };

    if (!targetSystem || !['SGC', 'MANUTENCAO', 'PCA', 'DIARIAS'].includes(targetSystem)) {
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

    // Verifica se possui permissão no sistema de destino
    let roleForSystem: string | null = null;
    let systemBaseUrl = '';

    if (targetSystem === 'SGC') {
      roleForSystem = userDb.perfilSgc;
      systemBaseUrl = process.env.SGC_URL || 'http://localhost:3000';
    } else if (targetSystem === 'MANUTENCAO') {
      roleForSystem = userDb.perfilManut;
      systemBaseUrl = process.env.MANUTENCAO_URL || 'http://localhost:3003';
    } else if (targetSystem === 'PCA') {
      roleForSystem = userDb.perfilPca;
      systemBaseUrl = process.env.PCA_URL || 'http://localhost:3002';
    } else if (targetSystem === 'DIARIAS') {
      roleForSystem = userDb.perfilDiarias;
      systemBaseUrl = process.env.DIARIAS_URL || 'http://localhost:3004';
    }

    if (!roleForSystem) {
      return NextResponse.json(
        { error: `Você não possui perfil de acesso autorizado para o sistema ${targetSystem}. Solicite autorização à PROAD.` },
        { status: 403 }
      );
    }

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
        cnpjEmpresa: userDb.cnpjEmpresa,
        razaoSocial: userDb.razaoSocial,
        perfilSgc: userDb.perfilSgc,
        perfilManut: userDb.perfilManut,
        perfilPca: userDb.perfilPca,
        permissoesPca: userDb.permissoesPca,
        perfilDiarias: userDb.perfilDiarias,
      },
      targetSystem
    );

    const redirectUrl = `${systemBaseUrl}/api/auth/sso-callback?token=${encodeURIComponent(ssoToken)}`;

    return NextResponse.json({
      success: true,
      targetSystem,
      role: roleForSystem,
      token: ssoToken,
      redirectUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao gerar token SSO.' }, { status: 500 });
  }
}
