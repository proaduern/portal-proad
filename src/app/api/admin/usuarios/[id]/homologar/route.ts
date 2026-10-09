import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';
import { normalizarMatriculaUern, formatarCpf } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado. Requer perfil de Administrador da PROAD.' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      decisao, // 'APROVAR' | 'REJEITAR' | 'DEVOLVER'
      motivoRejeicao,
      motivoDevolucao,
      nome,
      matricula,
      cpf,
      telefone,
      unidadeId,
      perfilSgc,
      perfilManut,
      perfilPca,
      permissoesPca,
      perfilDiarias,
    } = body;

    const usuario = await prisma.usuarioCentral.findUnique({
      where: { id },
      include: { unidade: true },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não localizado.' }, { status: 404 });
    }

    // 1. DEVOLVER PARA CORREÇÃO PELO USUÁRIO
    if (decisao === 'DEVOLVER') {
      const usuarioDevolvido = await prisma.usuarioCentral.update({
        where: { id },
        data: {
          status: 'DEVOLVIDO_CORRECAO',
          motivoDevolucao: motivoDevolucao || 'Favor revisar e corrigir os dados informados no seu cadastro.',
          dataDevolucao: new Date(),
        },
      });

      await prisma.logAuditoriaCentral.create({
        data: {
          sistema: 'PORTAL',
          acao: 'DEVOLUCAO_CADASTRO',
          entidade: 'UsuarioCentral',
          entidadeId: id,
          entidadeNome: usuario.nome,
          descricao: `Cadastro de ${usuario.nome} devolvido para correção pelo próprio usuário. Motivo: ${motivoDevolucao}`,
          usuarioId: admin.id,
          usuarioNome: admin.nome,
          usuarioEmail: admin.email,
          usuarioRole: admin.perfilSgc || 'ADMIN_PROAD',
          unidadeSigla: admin.unidadeSigla || 'PROAD',
          dadosAnteriores: { status: usuario.status },
          dadosNovos: { status: 'DEVOLVIDO_CORRECAO', motivoDevolucao },
          camposAlterados: ['status', 'motivoDevolucao'],
          detalhes: {
            alvoEmail: usuario.email,
            motivo: motivoDevolucao,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Cadastro de ${usuario.nome} devolvido com sucesso para que o próprio usuário efetue as correções.`,
        usuario: usuarioDevolvido,
      });
    }

    // 2. REJEITAR / BLOQUEAR
    if (decisao === 'REJEITAR') {
      const usuarioBloqueado = await prisma.usuarioCentral.update({
        where: { id },
        data: {
          status: 'BLOQUEADO',
          motivoBloqueio: motivoRejeicao || 'Cadastro não homologado pela administração da PROAD.',
          aprovadoEm: new Date(),
          aprovadoPor: admin.email,
        },
      });

      await prisma.logAuditoriaCentral.create({
        data: {
          sistema: 'PORTAL',
          acao: 'BLOQUEIO',
          entidade: 'UsuarioCentral',
          entidadeId: id,
          entidadeNome: usuario.nome,
          descricao: `Homologação indeferida/bloqueada para ${usuario.nome} (${usuario.email}). Motivo: ${motivoRejeicao || 'Não informado'}`,
          usuarioId: admin.id,
          usuarioNome: admin.nome,
          usuarioEmail: admin.email,
          usuarioRole: admin.perfilSgc || 'ADMIN_PROAD',
          unidadeSigla: admin.unidadeSigla || 'PROAD',
          dadosAnteriores: { status: usuario.status },
          dadosNovos: { status: 'BLOQUEADO', motivoBloqueio: motivoRejeicao },
          camposAlterados: ['status', 'motivoBloqueio'],
          detalhes: {
            alvoEmail: usuario.email,
            motivo: motivoRejeicao,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Cadastro de ${usuario.nome} foi indeferido/bloqueado.`,
        usuario: usuarioBloqueado,
      });
    }

    // 3. APROVAÇÃO E HOMOLOGAÇÃO (com suporte a edição cadastral direta pelo admin)
    const dataUpdate: any = {
      status: 'ATIVO',
      motivoBloqueio: null,
      motivoDevolucao: null,
      aprovadoEm: new Date(),
      aprovadoPor: admin.email,
      perfilSgc: perfilSgc || null,
      perfilManut: perfilManut || null,
      perfilPca: perfilPca || null,
      permissoesPca: permissoesPca || null,
      perfilDiarias: perfilDiarias || null,
    };

    if (nome && nome.trim()) dataUpdate.nome = nome.trim();
    if (matricula !== undefined) {
      dataUpdate.matricula = normalizarMatriculaUern(matricula) || matricula;
    }
    if (cpf) dataUpdate.cpf = formatarCpf(cpf);
    if (telefone !== undefined) dataUpdate.telefone = telefone ? telefone.trim() : null;
    if (unidadeId !== undefined) dataUpdate.unidadeId = unidadeId || null;

    const usuarioAprovado = await prisma.usuarioCentral.update({
      where: { id },
      data: dataUpdate,
      include: { unidade: true },
    });

    await prisma.logAuditoriaCentral.create({
      data: {
        sistema: 'PORTAL',
        acao: 'HOMOLOGACAO',
        entidade: 'UsuarioCentral',
        entidadeId: id,
        entidadeNome: usuarioAprovado.nome,
        descricao: `Homologação e concessão de perfis para ${usuarioAprovado.nome} (${usuarioAprovado.email})`,
        usuarioId: admin.id,
        usuarioNome: admin.nome,
        usuarioEmail: admin.email,
        usuarioRole: admin.perfilSgc || 'ADMIN_PROAD',
        unidadeSigla: admin.unidadeSigla || 'PROAD',
        dadosAnteriores: {
          status: usuario.status,
          nome: usuario.nome,
          matricula: usuario.matricula,
          cpf: usuario.cpf,
          unidadeId: usuario.unidadeId,
          perfilSgc: usuario.perfilSgc,
          perfilManut: usuario.perfilManut,
          perfilPca: usuario.perfilPca,
          perfilDiarias: usuario.perfilDiarias,
        },
        dadosNovos: {
          status: 'ATIVO',
          nome: usuarioAprovado.nome,
          matricula: usuarioAprovado.matricula,
          cpf: usuarioAprovado.cpf,
          unidadeId: usuarioAprovado.unidadeId,
          perfilSgc: usuarioAprovado.perfilSgc,
          perfilManut: usuarioAprovado.perfilManut,
          perfilPca: usuarioAprovado.perfilPca,
          perfilDiarias: usuarioAprovado.perfilDiarias,
        },
        camposAlterados: ['status', 'nome', 'matricula', 'unidadeId', 'perfilSgc', 'perfilManut', 'perfilPca', 'perfilDiarias'],
        detalhes: {
          alvoId: id,
          alvoEmail: usuarioAprovado.email,
          alvoNome: usuarioAprovado.nome,
          ajustesCadastraisFeitosPeloAdmin: {
            nomeOriginal: usuario.nome,
            nomeAtualizado: usuarioAprovado.nome,
            matriculaOriginal: usuario.matricula,
            matriculaAtualizada: usuarioAprovado.matricula,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cadastro de ${usuarioAprovado.nome} homologado com sucesso!`,
      usuario: usuarioAprovado,
    });
  } catch (err: any) {
    console.error('Erro na homologação:', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao homologar usuário.' }, { status: 500 });
  }
}
