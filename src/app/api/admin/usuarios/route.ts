import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminSession, hashPassword } from '@/lib/auth';
import {
  validarCpf,
  validarCnpj,
  validarMatricula,
  validarEmailInstitucional,
  formatarCpf,
  formatarCnpj,
  formatarMatricula,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado. Requer perfil de Administrador.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim() || '';
    const status = searchParams.get('status') || '';
    const tipo = searchParams.get('tipo') || '';
    const unidadeId = searchParams.get('unidadeId') || '';

    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (tipo) {
      where.tipoUsuario = tipo;
    }
    if (unidadeId) {
      where.unidadeId = unidadeId;
    }
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } },
        { matricula: { contains: search } },
        { cnpjEmpresa: { contains: search } },
        { razaoSocial: { contains: search, mode: 'insensitive' } },
      ];
    }

    const usuarios = await prisma.usuarioCentral.findMany({
      where,
      include: {
        unidade: {
          select: {
            id: true,
            sigla: true,
            nome: true,
            campus: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDENTE_APROVACAO vem primeiro
        { criadoEm: 'desc' },
      ],
    });

    const contadores = {
      total: await prisma.usuarioCentral.count(),
      pendentes: await prisma.usuarioCentral.count({ where: { status: 'PENDENTE_APROVACAO' } }),
      ativos: await prisma.usuarioCentral.count({ where: { status: 'ATIVO' } }),
      bloqueados: await prisma.usuarioCentral.count({ where: { status: 'BLOQUEADO' } }),
      servidores: await prisma.usuarioCentral.count({ where: { tipoUsuario: 'SERVIDOR_UERN' } }),
      fornecedores: await prisma.usuarioCentral.count({ where: { tipoUsuario: 'FORNECEDOR_EXTERNO' } }),
    };

    return NextResponse.json({ usuarios, contadores });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao consultar usuários.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado. Requer perfil de Administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      tipoUsuario,
      nome,
      email,
      cpf,
      telefone,
      matricula,
      unidadeId,
      cnpjEmpresa,
      razaoSocial,
      nomeFantasia,
      cargoPreposto,
      perfilSgc,
      perfilManut,
      perfilPca,
      permissoesPca,
      perfilDiarias,
      senha,
    } = body;

    if (!nome || !email || !cpf) {
      return NextResponse.json({ error: 'Nome, E-mail e CPF são obrigatórios.' }, { status: 400 });
    }

    if (!validarCpf(cpf)) {
      return NextResponse.json({ error: 'O CPF informado é inválido.' }, { status: 400 });
    }

    const emailLimpo = email.trim().toLowerCase();
    const cpfFormatado = formatarCpf(cpf);

    if (tipoUsuario === 'SERVIDOR_UERN') {
      if (!validarEmailInstitucional(emailLimpo)) {
        return NextResponse.json({ error: 'Servidores UERN devem possuir e-mail institucional @uern.br.' }, { status: 400 });
      }
      if (matricula && !validarMatricula(matricula)) {
        return NextResponse.json({ error: 'Matrícula no formato inválido. Use o padrão xxxxxx-x.' }, { status: 400 });
      }
    } else if (tipoUsuario === 'FORNECEDOR_EXTERNO') {
      if (!cnpjEmpresa || !validarCnpj(cnpjEmpresa)) {
        return NextResponse.json({ error: 'CNPJ da empresa é obrigatório e deve ser válido.' }, { status: 400 });
      }
      if (!razaoSocial) {
        return NextResponse.json({ error: 'Razão Social da empresa é obrigatória.' }, { status: 400 });
      }
    }

    // Verificar duplicidade
    const existe = await prisma.usuarioCentral.findFirst({
      where: {
        OR: [{ email: emailLimpo }, { cpf: cpfFormatado }],
      },
    });

    if (existe) {
      return NextResponse.json({ error: 'Já existe um usuário cadastrado com este E-mail ou CPF.' }, { status: 409 });
    }

    let senhaHash = null;
    if (senha) {
      senhaHash = await hashPassword(senha);
    }

    const novoUsuario = await prisma.usuarioCentral.create({
      data: {
        tipoUsuario: tipoUsuario || 'SERVIDOR_UERN',
        status: 'ATIVO', // Cadastro direto pelo admin já nasce ativo
        nome: nome.trim(),
        email: emailLimpo,
        cpf: cpfFormatado,
        telefone: telefone ? telefone.trim() : null,
        senhaHash,
        matricula: matricula ? formatarMatricula(matricula) : null,
        unidadeId: unidadeId || null,
        cnpjEmpresa: cnpjEmpresa ? formatarCnpj(cnpjEmpresa) : null,
        razaoSocial: razaoSocial ? razaoSocial.trim() : null,
        nomeFantasia: nomeFantasia ? nomeFantasia.trim() : null,
        cargoPreposto: cargoPreposto ? cargoPreposto.trim() : null,
        perfilSgc: perfilSgc || null,
        perfilManut: perfilManut || null,
        perfilPca: perfilPca || null,
        permissoesPca: permissoesPca || null,
        perfilDiarias: perfilDiarias || null,
        aprovadoEm: new Date(),
        aprovadoPor: admin.email,
      },
      include: { unidade: true },
    });

    await prisma.logAuditoriaCentral.create({
      data: {
        usuarioId: admin.id,
        usuarioEmail: admin.email,
        acao: 'CRIAR_USUARIO_MANUAL',
        detalhes: { novoUsuarioId: novoUsuario.id, email: novoUsuario.email, tipo: novoUsuario.tipoUsuario },
      },
    });

    return NextResponse.json({ success: true, usuario: novoUsuario }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao cadastrar usuário manualmente.' }, { status: 500 });
  }
}
