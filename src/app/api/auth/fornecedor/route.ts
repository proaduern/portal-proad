import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { setSessionCookie, hashPassword, verifyPassword } from '@/lib/auth';
import { validarCnpj, validarCpf, formatarCnpj, formatarCpf } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ========================================================
    // 1. FLUXO DE LOGIN DO FORNECEDOR
    // ========================================================
    if (action === 'login') {
      const { email, senha } = body;
      if (!email || !senha) {
        return NextResponse.json({ error: 'Informe e-mail e senha de acesso.' }, { status: 400 });
      }

      const emailLimpo = email.trim().toLowerCase();
      const fornecedor = await prisma.usuarioCentral.findUnique({
        where: { email: emailLimpo },
      });

      if (!fornecedor || fornecedor.tipoUsuario !== 'FORNECEDOR_EXTERNO' || !fornecedor.senhaHash) {
        return NextResponse.json({ error: 'Credenciais inválidas ou cadastro não localizado.' }, { status: 401 });
      }

      const senhaValida = await verifyPassword(senha, fornecedor.senhaHash);
      if (!senhaValida) {
        return NextResponse.json({ error: 'Credenciais inválidas. Verifique sua senha.' }, { status: 401 });
      }

      if (fornecedor.status === 'BLOQUEADO') {
        return NextResponse.json(
          { error: fornecedor.motivoBloqueio || 'Credenciamento suspenso. Procure a PROAD para regularização.' },
          { status: 403 }
        );
      }

      // Configurar Sessão
      await setSessionCookie({
        id: fornecedor.id,
        nome: fornecedor.nome,
        email: fornecedor.email,
        cpf: fornecedor.cpf,
        tipoUsuario: 'FORNECEDOR_EXTERNO',
        status: fornecedor.status,
        cnpjEmpresa: fornecedor.cnpjEmpresa,
        razaoSocial: fornecedor.razaoSocial,
        perfilSgc: fornecedor.perfilSgc,
        perfilManut: fornecedor.perfilManut,
      });

      if (fornecedor.status === 'PENDENTE_APROVACAO' || fornecedor.status === 'DEVOLVIDO_CORRECAO') {
        return NextResponse.json({
          status: fornecedor.status,
          mensagem: fornecedor.status === 'DEVOLVIDO_CORRECAO'
            ? 'Seu cadastro possui pendências a corrigir antes da homologação.'
            : 'Sua solicitação de credenciamento está em análise pela equipe da PROAD.',
          redirect: '/quarentena',
        });
      }

      return NextResponse.json({
        status: 'ATIVO',
        mensagem: 'Login realizado com sucesso!',
        redirect: '/hub',
      });
    }

    // ========================================================
    // 2. FLUXO DE AUTO-CREDENCIAMENTO (REGISTRO)
    // ========================================================
    if (action === 'registro') {
      const {
        nome,
        email,
        cpf,
        senha,
        cnpjEmpresa,
        razaoSocial,
        nomeFantasia,
        cargoPreposto,
        telefone,
      } = body;

      // Validação de campos obrigatórios
      if (!nome || !email || !cpf || !senha || !cnpjEmpresa || !razaoSocial) {
        return NextResponse.json(
          { error: 'Todos os campos obrigatórios (Razão Social, CNPJ, Representante, CPF, E-mail e Senha) devem ser preenchidos.' },
          { status: 400 }
        );
      }

      if (senha.length < 6) {
        return NextResponse.json({ error: 'A senha de acesso deve ter pelo menos 6 caracteres.' }, { status: 400 });
      }

      // Validação de CNPJ
      if (!validarCnpj(cnpjEmpresa)) {
        return NextResponse.json({ error: 'O CNPJ informado é inválido. Verifique os dígitos digitados.' }, { status: 400 });
      }

      // Validação de CPF do Preposto
      if (!validarCpf(cpf)) {
        return NextResponse.json({ error: 'O CPF do representante informado é inválido.' }, { status: 400 });
      }

      const emailLimpo = email.trim().toLowerCase();
      const cnpjFormatado = formatarCnpj(cnpjEmpresa);
      const cpfFormatado = formatarCpf(cpf);

      // Verifica duplicidade
      const duplicado = await prisma.usuarioCentral.findFirst({
        where: {
          OR: [{ email: emailLimpo }, { cpf: cpfFormatado }],
        },
      });

      if (duplicado) {
        if (duplicado.email === emailLimpo) {
          return NextResponse.json({ error: 'Já existe um cadastro ativo com este e-mail.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Já existe um cadastro ativo com este CPF de preposto.' }, { status: 409 });
      }

      const senhaHash = await hashPassword(senha);

      const novoFornecedor = await prisma.usuarioCentral.create({
        data: {
          tipoUsuario: 'FORNECEDOR_EXTERNO',
          status: 'PENDENTE_APROVACAO',
          nome: nome.trim(),
          email: emailLimpo,
          cpf: cpfFormatado,
          senhaHash,
          cnpjEmpresa: cnpjFormatado,
          razaoSocial: razaoSocial.trim(),
          nomeFantasia: nomeFantasia ? nomeFantasia.trim() : razaoSocial.trim(),
          cargoPreposto: cargoPreposto ? cargoPreposto.trim() : 'Preposto / Representante',
          telefone: telefone ? telefone.trim() : null,
          // Perfil padrão sugerido no SGC e Manutenção quando for homologado
          perfilSgc: 'FORNECEDOR',
          perfilManut: 'EMPRESA',
        },
      });

      // Auditoria
      await prisma.logAuditoriaCentral.create({
        data: {
          usuarioId: novoFornecedor.id,
          usuarioEmail: novoFornecedor.email,
          acao: 'CREDENCIAMENTO_FORNECEDOR',
          detalhes: {
            cnpj: novoFornecedor.cnpjEmpresa,
            razaoSocial: novoFornecedor.razaoSocial,
            preposto: novoFornecedor.nome,
          },
        },
      });

      // Sessão com quarentena
      await setSessionCookie({
        id: novoFornecedor.id,
        nome: novoFornecedor.nome,
        email: novoFornecedor.email,
        cpf: novoFornecedor.cpf,
        tipoUsuario: 'FORNECEDOR_EXTERNO',
        status: 'PENDENTE_APROVACAO',
        cnpjEmpresa: novoFornecedor.cnpjEmpresa,
        razaoSocial: novoFornecedor.razaoSocial,
      });

      return NextResponse.json({
        success: true,
        message: 'Solicitação de credenciamento enviada com sucesso! Aguarde a homologação da PROAD.',
        redirect: '/quarentena',
      });
    }

    return NextResponse.json({ error: 'Ação não suportada.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao processar solicitação de fornecedor.' }, { status: 500 });
  }
}
