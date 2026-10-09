import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminSession, hashPassword } from '@/lib/auth';
import {
  validarCpf,
  validarCnpj,
  validarMatricula,
  formatarCpf,
  formatarCnpj,
  formatarMatricula,
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
      nome,
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
      novaSenha,
    } = body;

    const dataToUpdate: any = {};

    if (nome) dataToUpdate.nome = nome.trim();
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
      if (matricula && !validarMatricula(matricula)) {
        return NextResponse.json({ error: 'Formato de matrícula inválido (deve ser xxxxxx-x).' }, { status: 400 });
      }
      dataToUpdate.matricula = matricula ? formatarMatricula(matricula) : null;
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
          status: usuarioExistente.status,
          perfilSgc: usuarioExistente.perfilSgc,
          perfilManut: usuarioExistente.perfilManut,
          perfilPca: usuarioExistente.perfilPca,
          perfilDiarias: usuarioExistente.perfilDiarias,
          unidadeId: usuarioExistente.unidadeId,
        },
        dadosNovos: {
          nome: usuarioAtualizado.nome,
          status: usuarioAtualizado.status,
          perfilSgc: usuarioAtualizado.perfilSgc,
          perfilManut: usuarioAtualizado.perfilManut,
          perfilPca: usuarioAtualizado.perfilPca,
          perfilDiarias: usuarioAtualizado.perfilDiarias,
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
