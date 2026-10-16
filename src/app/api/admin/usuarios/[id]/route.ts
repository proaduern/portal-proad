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
  normalizarMatriculaUern,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado. Requer perfil de Administrador.' }, { status: 403 });
    }

    const { id } = params;
    const usuario = await prisma.usuarioCentral.findUnique({
      where: { id },
      include: {
        unidade: true,
        logs: {
          orderBy: { criadoEm: 'desc' },
          take: 10,
        },
      },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ usuario });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao carregar usuário.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado. Requer perfil de Administrador.' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();

    const usuarioExistente = await prisma.usuarioCentral.findUnique({
      where: { id },
    });

    if (!usuarioExistente) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const {
      tipoUsuario,
      nome,
      email,
      cpf,
      status,
      motivoBloqueio,
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
      perfilClimatizacao,
      novaSenha,
    } = body;

    const dataToUpdate: any = {};

    if (tipoUsuario) dataToUpdate.tipoUsuario = tipoUsuario;
    if (nome) dataToUpdate.nome = nome.trim();

    if (email !== undefined && email.trim()) {
      const emailLimpo = email.trim().toLowerCase();
      if ((tipoUsuario || usuarioExistente.tipoUsuario) === 'SERVIDOR_UERN' && !validarEmailInstitucional(emailLimpo)) {
        return NextResponse.json({ error: 'Servidores UERN devem possuir e-mail institucional @uern.br.' }, { status: 400 });
      }
      if (emailLimpo !== usuarioExistente.email) {
        const emailEmUso = await prisma.usuarioCentral.findFirst({
          where: { email: emailLimpo, id: { not: id } },
        });
        if (emailEmUso) {
          return NextResponse.json({ error: 'Já existe outro usuário cadastrado com este E-mail.' }, { status: 409 });
        }
        dataToUpdate.email = emailLimpo;
      }
    }

    if (cpf !== undefined && cpf.trim()) {
      const cpfFormatado = formatarCpf(cpf);
      if (cpfFormatado !== usuarioExistente.cpf) {
        if (!validarCpf(cpfFormatado)) {
          return NextResponse.json({ error: 'O CPF informado é inválido.' }, { status: 400 });
        }
        const cpfEmUso = await prisma.usuarioCentral.findFirst({
          where: { cpf: cpfFormatado, id: { not: id } },
        });
        if (cpfEmUso) {
          return NextResponse.json({ error: 'Já existe outro usuário cadastrado com este CPF.' }, { status: 409 });
        }
        dataToUpdate.cpf = cpfFormatado;
      }
    }

    if (telefone !== undefined) dataToUpdate.telefone = telefone ? telefone.trim() : null;
    if (status) {
      dataToUpdate.status = status;
      if (status === 'BLOQUEADO') {
        dataToUpdate.motivoBloqueio = motivoBloqueio || 'Acesso suspenso pela administração da PROAD.';
      } else {
        dataToUpdate.motivoBloqueio = null;
      }
    }

    if (matricula !== undefined) {
      const matNormalizada = matricula ? normalizarMatriculaUern(matricula) : null;
      if (matNormalizada && !validarMatricula(matNormalizada)) {
        return NextResponse.json({ error: 'Formato de matrícula inválido (ex: 81558 ou 008155-8).' }, { status: 400 });
      }
      dataToUpdate.matricula = matNormalizada;
    }

    if (unidadeId !== undefined) {
      dataToUpdate.unidadeId = unidadeId || null;
    }

    if (cnpjEmpresa !== undefined) {
      if (cnpjEmpresa && !validarCnpj(cnpjEmpresa)) {
        return NextResponse.json({ error: 'CNPJ inválido.' }, { status: 400 });
      }
      dataToUpdate.cnpjEmpresa = cnpjEmpresa ? formatarCnpj(cnpjEmpresa) : null;
    }

    if (razaoSocial !== undefined) dataToUpdate.razaoSocial = razaoSocial ? razaoSocial.trim() : null;
    if (nomeFantasia !== undefined) dataToUpdate.nomeFantasia = nomeFantasia ? nomeFantasia.trim() : null;
    if (cargoPreposto !== undefined) dataToUpdate.cargoPreposto = cargoPreposto ? cargoPreposto.trim() : null;

    // Matriz de perfis
    if (perfilSgc !== undefined) dataToUpdate.perfilSgc = perfilSgc || null;
    if (perfilManut !== undefined) dataToUpdate.perfilManut = perfilManut || null;
    if (perfilPca !== undefined) dataToUpdate.perfilPca = perfilPca || null;
    if (permissoesPca !== undefined) dataToUpdate.permissoesPca = permissoesPca;
    if (perfilDiarias !== undefined) dataToUpdate.perfilDiarias = perfilDiarias || null;
    if (perfilClimatizacao !== undefined) dataToUpdate.perfilClimatizacao = perfilClimatizacao || null;

    // Redefinição de senha se fornecida
    if (novaSenha && novaSenha.trim().length >= 6) {
      dataToUpdate.senhaHash = await hashPassword(novaSenha.trim());
    }

    const usuarioAtualizado = await prisma.usuarioCentral.update({
      where: { id },
      data: dataToUpdate,
      include: { unidade: true },
    });

    await prisma.logAuditoriaCentral.create({
      data: {
        sistema: 'PORTAL',
        acao: 'EDICAO',
        entidade: 'UsuarioCentral',
        entidadeId: id,
        entidadeNome: usuarioAtualizado.nome,
        descricao: `Edição cadastral do usuário ${usuarioAtualizado.nome} (${usuarioAtualizado.email})`,
        usuarioId: admin.id,
        usuarioNome: admin.nome,
        usuarioEmail: admin.email,
        usuarioRole: admin.perfilSgc || 'ADMIN_PROAD',
        unidadeSigla: admin.unidadeSigla || 'PROAD',
        dadosAnteriores: {
          nome: usuarioExistente.nome,
          email: usuarioExistente.email,
          cpf: usuarioExistente.cpf,
          matricula: usuarioExistente.matricula,
          status: usuarioExistente.status,
          perfilSgc: usuarioExistente.perfilSgc,
          perfilManut: usuarioExistente.perfilManut,
          perfilPca: usuarioExistente.perfilPca,
          perfilDiarias: usuarioExistente.perfilDiarias,
          perfilClimatizacao: (usuarioExistente as any).perfilClimatizacao,
          unidadeId: usuarioExistente.unidadeId,
        },
        dadosNovos: {
          nome: usuarioAtualizado.nome,
          email: usuarioAtualizado.email,
          cpf: usuarioAtualizado.cpf,
          matricula: usuarioAtualizado.matricula,
          status: usuarioAtualizado.status,
          perfilSgc: usuarioAtualizado.perfilSgc,
          perfilManut: usuarioAtualizado.perfilManut,
          perfilPca: usuarioAtualizado.perfilPca,
          perfilDiarias: usuarioAtualizado.perfilDiarias,
          perfilClimatizacao: (usuarioAtualizado as any).perfilClimatizacao,
          unidadeId: usuarioAtualizado.unidadeId,
        },
        camposAlterados: Object.keys(dataToUpdate),
        detalhes: {
          alvoId: id,
          alvoEmail: usuarioAtualizado.email,
          alteracoes: Object.keys(dataToUpdate),
        },
      },
    });

    return NextResponse.json({ success: true, usuario: usuarioAtualizado });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar usuário.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado. Requer perfil de Administrador.' }, { status: 403 });
    }

    const { id } = params;

    // Não permite que o admin delete a si mesmo
    if (id === admin.id) {
      return NextResponse.json({ error: 'Você não pode excluir sua própria conta de administrador.' }, { status: 400 });
    }

    const usuario = await prisma.usuarioCentral.findUnique({
      where: { id },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    await prisma.usuarioCentral.delete({
      where: { id },
    });

    await prisma.logAuditoriaCentral.create({
      data: {
        usuarioId: admin.id,
        usuarioEmail: admin.email,
        acao: 'EXCLUIR_USUARIO',
        detalhes: { excluidoEmail: usuario.email, excluidoNome: usuario.nome },
      },
    });

    return NextResponse.json({ success: true, message: `Usuário ${usuario.email} removido com sucesso.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao remover usuário.' }, { status: 500 });
  }
}
