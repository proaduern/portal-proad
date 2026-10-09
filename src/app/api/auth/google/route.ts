import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { setSessionCookie } from '@/lib/auth';
import { validarEmailInstitucional } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, nome, googleId, fotoUrl } = body;

    if (!email) {
      return NextResponse.json({ error: 'E-mail não informado.' }, { status: 400 });
    }

    const emailLimpo = email.trim().toLowerCase();

    // 1. Validação estrita do domínio institucional @uern.br
    if (!validarEmailInstitucional(emailLimpo)) {
      return NextResponse.json(
        {
          error: 'Acesso restrito: apenas contas institucionais com domínio @uern.br têm permissão de acesso ao Portal PROAD.',
          dominioInvalido: true,
        },
        { status: 403 }
      );
    }

    // 2. Busca usuário no banco central
    const usuarioExistente = await prisma.usuarioCentral.findUnique({
      where: { email: emailLimpo },
      include: { unidade: true },
    });

    // 3. Caso não exista: primeiro acesso detectado
    if (!usuarioExistente) {
      // Não sugerir prefixo de login (ex: mariosergio). Exigir nome completo civil.
      const nomeGoogle = (nome || '').trim();
      const nomeValido = nomeGoogle.includes(' ') ? nomeGoogle : '';

      return NextResponse.json({
        status: 'PRIMEIRO_ACESSO',
        email: emailLimpo,
        nome: nomeValido,
        fotoUrl: fotoUrl || null,
        redirect: '/pre-cadastro',
      });
    }

    // 4. Se o usuário estiver bloqueado
    if (usuarioExistente.status === 'BLOQUEADO') {
      return NextResponse.json(
        {
          error: usuarioExistente.motivoBloqueio || 'Seu acesso está suspenso. Procure a Pró-Reitoria de Administração (PROAD).',
          status: 'BLOQUEADO',
        },
        { status: 403 }
      );
    }

    // 5. Configurar sessão
    await setSessionCookie({
      id: usuarioExistente.id,
      nome: usuarioExistente.nome,
      email: usuarioExistente.email,
      cpf: usuarioExistente.cpf,
      tipoUsuario: usuarioExistente.tipoUsuario,
      status: usuarioExistente.status,
      matricula: usuarioExistente.matricula,
      unidadeId: usuarioExistente.unidadeId,
      unidadeSigla: usuarioExistente.unidade?.sigla,
      unidadeNome: usuarioExistente.unidade?.nome,
      fotoUrl: usuarioExistente.fotoUrl || fotoUrl,
      perfilSgc: usuarioExistente.perfilSgc,
      perfilManut: usuarioExistente.perfilManut,
      perfilPca: usuarioExistente.perfilPca,
      permissoesPca: usuarioExistente.permissoesPca,
      perfilDiarias: usuarioExistente.perfilDiarias,
    });

    // 6. Se ainda estiver pendente de aprovação pela PROAD
    if (usuarioExistente.status === 'PENDENTE_APROVACAO') {
      return NextResponse.json({
        status: 'PENDENTE_APROVACAO',
        mensagem: 'Seu cadastro está aguardando homologação do Administrador da PROAD.',
        redirect: '/quarentena',
      });
    }

    // 7. Usuário ativo liberado
    return NextResponse.json({
      status: 'ATIVO',
      mensagem: 'Login realizado com sucesso!',
      redirect: '/hub',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao processar login Google.' }, { status: 500 });
  }
}
