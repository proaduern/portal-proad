import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { setSessionCookie } from '@/lib/auth';
import {
  validarEmailInstitucional,
  validarCpf,
  validarMatricula,
  formatarCpf,
  formatarMatricula,
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

    // 4. Validação da Matrícula no padrão xxxxxx-x
    if (!validarMatricula(matricula)) {
      return NextResponse.json(
        { error: 'A matrícula deve seguir o padrão funcional da UERN: 6 dígitos seguidos de hífen e dígito (exemplo: 123456-7).' },
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

    // 6. Verifica unicidade de e-mail e CPF
    const cpfFormatado = formatarCpf(cpf);
    const matriculaFormatada = formatarMatricula(matricula);

    const duplicado = await prisma.usuarioCentral.findFirst({
      where: {
        OR: [{ email: emailLimpo }, { cpf: cpfFormatado }],
      },
    });

    if (duplicado) {
      if (duplicado.email === emailLimpo) {
        return NextResponse.json({ error: 'Já existe um cadastro com este e-mail institucional.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Já existe um cadastro com este número de CPF.' }, { status: 409 });
    }

    // 7. Cria o usuário com status PENDENTE_APROVACAO
    const novoUsuario = await prisma.usuarioCentral.create({
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

    // 8. Registra Auditoria
    await prisma.logAuditoriaCentral.create({
      data: {
        usuarioId: novoUsuario.id,
        usuarioEmail: novoUsuario.email,
        acao: 'PRE_CADASTRO_SERVIDOR',
        detalhes: {
          nome: novoUsuario.nome,
          matricula: novoUsuario.matricula,
          cpf: novoUsuario.cpf,
          unidadeSigla: unidade.sigla,
        },
      },
    });

    // 9. Configura sessão com status de quarentena
    await setSessionCookie({
      id: novoUsuario.id,
      nome: novoUsuario.nome,
      email: novoUsuario.email,
      cpf: novoUsuario.cpf,
      tipoUsuario: novoUsuario.tipoUsuario,
      status: novoUsuario.status,
      matricula: novoUsuario.matricula,
      unidadeId: novoUsuario.unidadeId,
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
