import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { setSessionCookie } from '@/lib/auth';
import {
  validarEmailInstitucional,
  validarCpf,
  validarMatricula,
  formatarCpf,
  formatarMatricula,
  normalizarMatriculaUern,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, cpf, matricula, unidadeId, telefone, fotoUrl } = body;

    // 1. Validação de preenchimento obrigatório
    if (!nome || !email || !cpf || !matricula || !unidadeId) {
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios (Nome, E-mail, CPF, Matrícula e Unidade) devem ser preenchidos.' },
        { status: 400 }
      );
    }

    const emailLimpo = email.trim().toLowerCase();

    // 2. Validação de domínio institucional @uern.br
    if (!validarEmailInstitucional(emailLimpo)) {
      return NextResponse.json(
        { error: 'O pré-cadastro de servidores exige e-mail institucional oficial com final @uern.br.' },
        { status: 400 }
      );
    }

    // 3. Validação algorítmica real do CPF
    if (!validarCpf(cpf)) {
      return NextResponse.json(
        { error: 'O CPF informado é inválido. Por favor, confira os números digitados.' },
        { status: 400 }
      );
    }

    // 4. Normalização da Matrícula no padrão oficial xxxxxx-x
    const matriculaFormatada = normalizarMatriculaUern(matricula);
    if (!validarMatricula(matriculaFormatada)) {
      return NextResponse.json(
        { error: 'A matrícula deve conter números válidos da UERN (exemplo: 8155-8 ou 008155-8).' },
        { status: 400 }
      );
    }

    // 5. Verifica se Unidade existe
    const unidade = await prisma.unidadeCentral.findUnique({
      where: { id: unidadeId },
    });
    if (!unidade) {
      return NextResponse.json({ error: 'Unidade de lotação selecionada não foi encontrada.' }, { status: 404 });
    }

    const cpfFormatado = formatarCpf(cpf);

    // 6. Verifica se o usuário já existe
    const usuarioExistente = await prisma.usuarioCentral.findUnique({
      where: { email: emailLimpo },
    });

    let usuarioSalvo: any;

    if (usuarioExistente) {
      // Se já estiver ativo ou bloqueado, não permite recadastro
      if (usuarioExistente.status === 'ATIVO' || usuarioExistente.status === 'BLOQUEADO') {
        return NextResponse.json(
          { error: 'Este e-mail institucional já possui cadastro ativo ou bloqueado no sistema.' },
          { status: 409 }
        );
      }

      // Se estiver PENDENTE_APROVACAO ou DEVOLVIDO_CORRECAO, permite atualizar os dados (edição pelo próprio usuário)
      usuarioSalvo = await prisma.usuarioCentral.update({
        where: { id: usuarioExistente.id },
        data: {
          nome: nome.trim(),
          cpf: cpfFormatado,
          matricula: matriculaFormatada,
          unidadeId: unidade.id,
          telefone: telefone ? telefone.trim() : null,
          fotoUrl: fotoUrl || usuarioExistente.fotoUrl,
          status: 'PENDENTE_APROVACAO',
          motivoDevolucao: null,
          dataDevolucao: null,
        },
        include: { unidade: true },
      });
    } else {
      // Verifica unicidade de CPF para novos cadastros
      const cpfDuplicado = await prisma.usuarioCentral.findUnique({
        where: { cpf: cpfFormatado },
      });
      if (cpfDuplicado) {
        return NextResponse.json({ error: 'Já existe um cadastro com este número de CPF.' }, { status: 409 });
      }

      // 7. Cria novo usuário com status PENDENTE_APROVACAO
      usuarioSalvo = await prisma.usuarioCentral.create({
        data: {
          tipoUsuario: 'SERVIDOR_UERN',
          status: 'PENDENTE_APROVACAO',
          nome: nome.trim(),
          email: emailLimpo,
          cpf: cpfFormatado,
          matricula: matriculaFormatada,
          telefone: telefone ? telefone.trim() : null,
          fotoUrl: fotoUrl || null,
          unidadeId: unidade.id,
        },
        include: { unidade: true },
      });
    }

    // 8. Registra Auditoria
    await prisma.logAuditoriaCentral.create({
      data: {
        usuarioId: usuarioSalvo.id,
        usuarioEmail: usuarioSalvo.email,
        acao: usuarioExistente ? 'EDICAO_AUTO_CADASTRO' : 'PRE_CADASTRO_SERVIDOR',
        detalhes: {
          nome: usuarioSalvo.nome,
          matricula: usuarioSalvo.matricula,
          cpf: usuarioSalvo.cpf,
          unidadeSigla: unidade.sigla,
        },
      },
    });

    // 9. Configura sessão com status de quarentena
    await setSessionCookie({
      id: usuarioSalvo.id,
      nome: usuarioSalvo.nome,
      email: usuarioSalvo.email,
      cpf: usuarioSalvo.cpf,
      tipoUsuario: usuarioSalvo.tipoUsuario,
      status: usuarioSalvo.status,
      matricula: usuarioSalvo.matricula,
      unidadeId: usuarioSalvo.unidadeId,
      unidadeSigla: unidade.sigla,
      unidadeNome: unidade.nome,
    });

    return NextResponse.json({
      success: true,
      message: 'Pré-cadastro realizado com sucesso! Seus dados foram encaminhados para homologação da PROAD.',
      redirect: '/quarentena',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao realizar pré-cadastro.' }, { status: 500 });
  }
}
