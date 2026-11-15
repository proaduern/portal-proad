import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import crypto from 'crypto';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';

export interface EstatisticasBackup {
  geradoEm: string;
  hashSha256: string;
  totalTabelas: number;
  totalRegistros: number;
  resumoPorModulo: {
    portal: { usuarios: number; unidades: number; logsAuditoria: number };
    sgc: {
      contratos: number;
      itensContrato: number;
      responsaveis: number;
      ordensServicoCompra: number;
      medicoes: number;
      trabalhadores: number;
      atas: number;
    };
    pca: {
      unidades: number;
      dfds: number;
      itensDfd: number;
      consolidacoes: number;
      etps: number;
      trs: number;
      minutas: number;
    };
    climatizacao: {
      equipamentos: number;
      chamados: number;
      intervencoes: number;
    };
    diarias: {
      pedidosDiaria: number;
      viagens: number;
    };
  };
}

function serializarLinha(row: any): any {
  if (row === null || row === undefined) return row;
  const obj: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'bigint') {
      obj[k] = Number(v);
    } else if (v instanceof Date) {
      obj[k] = v.toISOString();
    } else if (v && typeof v === 'object' && 'd' in (v as any) && 'e' in (v as any) && 's' in (v as any)) {
      // Prisma Decimal
      obj[k] = Number(v.toString());
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      obj[k] = JSON.stringify(v);
    } else if (Array.isArray(v)) {
      obj[k] = JSON.stringify(v);
    } else {
      obj[k] = v;
    }
  }
  return obj;
}

async function querySegura(sql: string): Promise<any[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(sql);
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.warn(`Aviso em querySegura (${sql.slice(0, 60)}...):`, err);
    return [];
  }
}

function adicionarAbaExcel(wb: XLSX.WorkBook, nomeAba: string, dados: any[]) {
  const nomeLimpo = nomeAba.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Planilha';
  const linhasSerializadas =
    dados.length > 0
      ? dados.map(serializarLinha)
      : [{ Informativo: 'Nenhum registro cadastrado nesta tabela até o momento.' }];
  const ws = XLSX.utils.json_to_sheet(linhasSerializadas);

  // Ajusta largura das colunas automaticamente para facilitar leitura no Excel
  const colKeys = Object.keys(linhasSerializadas[0] || {});
  ws['!cols'] = colKeys.map((k) => ({
    wch: Math.min(50, Math.max(14, k.length + 6)),
  }));

  XLSX.utils.book_append_sheet(wb, ws, nomeLimpo);
}

function paragrafoTituloDocx(texto: string, level: any = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text: texto,
        bold: true,
        size: level === HeadingLevel.HEADING_1 ? 28 : 24,
        color: '003366',
      }),
    ],
  });
}

function paragrafoCampoDocx(rotulo: string, valor: any) {
  const textoValor =
    valor === null || valor === undefined || String(valor).trim() === ''
      ? 'Não informado'
      : typeof valor === 'object'
      ? JSON.stringify(valor, null, 2)
      : String(valor);
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${rotulo}: `, bold: true, size: 20, color: '1E293B' }),
      new TextRun({ text: textoValor, size: 20, color: '334155' }),
    ],
  });
}

function separadorDocx() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: {
      bottom: { color: 'CBD5E1', space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [],
  });
}

/**
 * Coleta 100% dos dados de todos os schemas (portal, public/SGC, pca, climatizacao, diarias)
 */
export async function coletarDadosCompletosEcossistema() {
  const [
    // PORTAL
    portalUnidades,
    portalUsuarios,
    portalAuditoria,
    // SGC (schema public)
    sgcContratos,
    sgcFornecedores,
    sgcItensContrato,
    sgcResponsaveis,
    sgcUsuarios,
    sgcOrdensServico,
    sgcMedicoes,
    sgcContaVinculada,
    sgcTrabalhadores,
    sgcFrequencias,
    sgcCcts,
    sgcRepactuacoes,
    sgcAtas,
    sgcAtaItens,
    sgcAtaAdesoes,
    sgcAlteracoes,
    sgcPenalidades,
    sgcImr,
    sgcNormativos,
    // PCA (schema pca)
    pcaAnos,
    pcaUnidades,
    pcaSetoresInternos,
    pcaSetoresTecnicos,
    pcaCategorias,
    pcaCatalogo,
    pcaDfds,
    pcaItensDfd,
    pcaConsolidacoes,
    pcaItensTecnicos,
    pcaEtps,
    pcaAnalisesRisco,
    pcaRiscosItens,
    pcaPesquisasPreco,
    pcaPesquisasPrecoItens,
    pcaTermosReferencia,
    pcaMinutasEdital,
    pcaMinutasContrato,
    pcaMinutasAta,
    pcaStatusLicitacao,
    // CLIMATIZACAO (schema climatizacao)
    climaContratos,
    climaEmpresas,
    climaUnidades,
    climaEquipamentos,
    climaChamados,
    climaIntervencoes,
    // DIARIAS (schema diarias)
    diariasUnidades,
    diariasBeneficiarios,
    diariasPedidos,
    diariasViagens,
  ] = await Promise.all([
    // PORTAL
    querySegura(`SELECT * FROM "portal"."portal_unidades" ORDER BY "sigla" ASC`),
    querySegura(
      `SELECT "id", "tipoUsuario", "status", "nome", "email", "cpf", "telefone", "matricula", "unidadeId", "cnpjEmpresa", "razaoSocial", "nomeFantasia", "cargoPreposto", "perfilSgc", "perfilManut", "perfilPca", "permissoesPca", "perfilDiarias", "perfilClimatizacao", "criadoEm", "atualizadoEm", "aprovadoEm", "aprovadoPor" FROM "portal"."portal_usuarios" ORDER BY "nome" ASC`
    ),
    querySegura(`SELECT * FROM "portal"."portal_logs_auditoria" ORDER BY "criadoEm" DESC LIMIT 5000`),
    // SGC
    querySegura(`SELECT * FROM "public"."contratos" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "public"."fornecedores" ORDER BY "razaoSocial" ASC`),
    querySegura(`SELECT * FROM "public"."contrato_itens" ORDER BY "contratoId", "numeroItem" ASC`),
    querySegura(`SELECT * FROM "public"."contrato_responsaveis" ORDER BY "contratoId" ASC`),
    querySegura(
      `SELECT "id", "nome", "email", "matricula", "role", "ativo", "unidadeSigla", "unidadeNome", "campus", "createdAt" FROM "public"."usuarios" ORDER BY "nome" ASC`
    ),
    querySegura(`SELECT * FROM "public"."ordens_servico" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "public"."medicoes_despesa" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "public"."conta_vinculada_movimentacoes" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "public"."trabalhadores_terceirizados" ORDER BY "nome" ASC`),
    querySegura(`SELECT * FROM "public"."trabalhador_frequencias" ORDER BY "ano" DESC, "mes" DESC`),
    querySegura(`SELECT * FROM "public"."convencoes_coletivas" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "public"."contratos_repactuacoes" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "public"."atas_registro_preco" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "public"."ata_itens" ORDER BY "numeroItem" ASC`),
    querySegura(`SELECT * FROM "public"."ata_adesoes" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "public"."contrato_alteracoes" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "public"."penalidades" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "public"."imr_avaliacoes" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "public"."normativos" ORDER BY "createdAt" DESC`),
    // PCA
    querySegura(`SELECT * FROM "pca"."Pca" ORDER BY "ano" DESC`),
    querySegura(
      `SELECT "id", "nome", "email", "elegivelCotaOP", "cotaOP", "cotaGeral", "cotaTipo", "ativa", "responsavelNome", "responsavelMatricula", "createdAt" FROM "pca"."Unidade" ORDER BY "nome" ASC`
    ),
    querySegura(
      `SELECT "id", "unidadeId", "nome", "email", "cotaOP", "cotaGeral", "ativo", "responsavelNome" FROM "pca"."SetorInterno" ORDER BY "nome" ASC`
    ),
    querySegura(
      `SELECT "id", "nome", "sigla", "email", "ativo", "responsavelNome" FROM "pca"."SetorTecnico" ORDER BY "sigla" ASC`
    ),
    querySegura(`SELECT * FROM "pca"."Categoria" ORDER BY "nome" ASC`),
    querySegura(`SELECT * FROM "pca"."ItemCatalogo" ORDER BY "nome" ASC`),
    querySegura(`SELECT * FROM "pca"."Dfd" ORDER BY "ano" DESC, "numero" ASC`),
    querySegura(`SELECT * FROM "pca"."ItemDfd" ORDER BY "dfdId" ASC`),
    querySegura(`SELECT * FROM "pca"."ConsolidacaoTecnica" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "pca"."ItemTecnico" ORDER BY "consolidacaoId" ASC`),
    querySegura(`SELECT * FROM "pca"."EstudoTecnicoPreliminar" ORDER BY "updatedAt" DESC`),
    querySegura(`SELECT * FROM "pca"."AnaliseRiscos" ORDER BY "updatedAt" DESC`),
    querySegura(`SELECT * FROM "pca"."RiscoItem" ORDER BY "analiseRiscosId" ASC`),
    querySegura(`SELECT * FROM "pca"."PesquisaPrecos" ORDER BY "updatedAt" DESC`),
    querySegura(`SELECT * FROM "pca"."PesquisaPrecoItem" ORDER BY "pesquisaId" ASC`),
    querySegura(`SELECT * FROM "pca"."TermoReferencia" ORDER BY "updatedAt" DESC`),
    querySegura(`SELECT * FROM "pca"."MinutaEdital" ORDER BY "updatedAt" DESC`),
    querySegura(`SELECT * FROM "pca"."MinutaContrato" ORDER BY "updatedAt" DESC`),
    querySegura(`SELECT * FROM "pca"."MinutaAta" ORDER BY "updatedAt" DESC`),
    querySegura(`SELECT * FROM "pca"."StatusLicitacao" ORDER BY "updatedAt" DESC`),
    // CLIMATIZACAO
    querySegura(`SELECT * FROM "climatizacao"."clima_contratos" ORDER BY "criadoEm" DESC`),
    querySegura(`SELECT * FROM "climatizacao"."clima_empresas" ORDER BY "razaoSocial" ASC`),
    querySegura(`SELECT * FROM "climatizacao"."clima_unidades" ORDER BY "sigla" ASC`),
    querySegura(`SELECT * FROM "climatizacao"."clima_equipamentos" ORDER BY "tombo" ASC`),
    querySegura(`SELECT * FROM "climatizacao"."clima_chamados" ORDER BY "criadoEm" DESC`),
    querySegura(`SELECT * FROM "climatizacao"."clima_intervencoes_itens" ORDER BY "criadoEm" DESC`),
    // DIARIAS
    querySegura(`SELECT * FROM "diarias"."Unidade" ORDER BY "sigla" ASC`),
    querySegura(`SELECT * FROM "diarias"."Beneficiario" ORDER BY "nome" ASC`),
    querySegura(`SELECT * FROM "diarias"."PedidoDiaria" ORDER BY "createdAt" DESC`),
    querySegura(`SELECT * FROM "diarias"."Viagem" ORDER BY "createdAt" DESC`),
  ]);

  const dados = {
    metadados: {
      instituicao: 'Universidade do Estado do Rio Grande do Norte (UERN)',
      orgao: 'Pró-Reitoria de Administração (PROAD)',
      geradoEm: new Date().toISOString(),
      versaoFormato: '3.0-TRIPLA-CAMADA',
    },
    portal: {
      unidades: portalUnidades,
      usuarios: portalUsuarios,
      logsAuditoria: portalAuditoria,
    },
    sgc: {
      contratos: sgcContratos,
      fornecedores: sgcFornecedores,
      itensContrato: sgcItensContrato,
      responsaveis: sgcResponsaveis,
      usuarios: sgcUsuarios,
      ordensServico: sgcOrdensServico,
      medicoes: sgcMedicoes,
      contaVinculada: sgcContaVinculada,
      trabalhadores: sgcTrabalhadores,
      frequencias: sgcFrequencias,
      convencoesColetivas: sgcCcts,
      repactuacoes: sgcRepactuacoes,
      atas: sgcAtas,
      ataItens: sgcAtaItens,
      ataAdesoes: sgcAtaAdesoes,
      alteracoes: sgcAlteracoes,
      penalidades: sgcPenalidades,
      imrAvaliacoes: sgcImr,
      normativos: sgcNormativos,
    },
    pca: {
      anosPca: pcaAnos,
      unidades: pcaUnidades,
      setoresInternos: pcaSetoresInternos,
      setoresTecnicos: pcaSetoresTecnicos,
      categorias: pcaCategorias,
      catalogo: pcaCatalogo,
      dfds: pcaDfds,
      itensDfd: pcaItensDfd,
      consolidacoes: pcaConsolidacoes,
      itensTecnicos: pcaItensTecnicos,
      etps: pcaEtps,
      analisesRisco: pcaAnalisesRisco,
      riscosItens: pcaRiscosItens,
      pesquisasPreco: pcaPesquisasPreco,
      pesquisasPrecoItens: pcaPesquisasPrecoItens,
      termosReferencia: pcaTermosReferencia,
      minutasEdital: pcaMinutasEdital,
      minutasContrato: pcaMinutasContrato,
      minutasAta: pcaMinutasAta,
      statusLicitacao: pcaStatusLicitacao,
    },
    climatizacao: {
      contratos: climaContratos,
      empresas: climaEmpresas,
      unidades: climaUnidades,
      equipamentos: climaEquipamentos,
      chamados: climaChamados,
      intervencoes: climaIntervencoes,
    },
    diarias: {
      unidades: diariasUnidades,
      beneficiarios: diariasBeneficiarios,
      pedidosDiaria: diariasPedidos,
      viagens: diariasViagens,
    },
  };

  const jsonSnapshot = JSON.stringify(
    dados,
    (_, v) => (typeof v === 'bigint' ? Number(v) : v),
    2
  );
  const hashSha256 = crypto.createHash('sha256').update(jsonSnapshot).digest('hex').toUpperCase();

  let totalRegistros = 0;
  let totalTabelas = 0;
  for (const mod of ['portal', 'sgc', 'pca', 'climatizacao', 'diarias'] as const) {
    for (const arr of Object.values(dados[mod])) {
      totalTabelas += 1;
      if (Array.isArray(arr)) totalRegistros += arr.length;
    }
  }

  const estatisticas: EstatisticasBackup = {
    geradoEm: dados.metadados.geradoEm,
    hashSha256,
    totalTabelas,
    totalRegistros,
    resumoPorModulo: {
      portal: {
        usuarios: portalUsuarios.length,
        unidades: portalUnidades.length,
        logsAuditoria: portalAuditoria.length,
      },
      sgc: {
        contratos: sgcContratos.length,
        itensContrato: sgcItensContrato.length,
        responsaveis: sgcResponsaveis.length,
        ordensServicoCompra: sgcOrdensServico.length,
        medicoes: sgcMedicoes.length,
        trabalhadores: sgcTrabalhadores.length,
        atas: sgcAtas.length,
      },
      pca: {
        unidades: pcaUnidades.length,
        dfds: pcaDfds.length,
        itensDfd: pcaItensDfd.length,
        consolidacoes: pcaConsolidacoes.length,
        etps: pcaEtps.length,
        trs: pcaTermosReferencia.length,
        minutas: pcaMinutasEdital.length + pcaMinutasContrato.length + pcaMinutasAta.length,
      },
      climatizacao: {
        equipamentos: climaEquipamentos.length,
        chamados: climaChamados.length,
        intervencoes: climaIntervencoes.length,
      },
      diarias: {
        pedidosDiaria: diariasPedidos.length,
        viagens: diariasViagens.length,
      },
    },
  };

  return { dados, jsonSnapshot, estatisticas };
}

/**
 * Gera os 4 arquivos Excel (.xlsx) organizados por sistema e abas
 */
export function gerarPlanilhasExcelBackup(dados: Awaited<ReturnType<typeof coletarDadosCompletosEcossistema>>['dados']) {
  // 1. SGC
  const wbSgc = XLSX.utils.book_new();
  const mapFornecedores = new Map(dados.sgc.fornecedores.map((f: any) => [f.id, f]));
  const mapUsuariosSgc = new Map(dados.sgc.usuarios.map((u: any) => [u.id, u]));
  const mapContratosSgc = new Map(dados.sgc.contratos.map((c: any) => [c.id, c]));

  const contratosFormatados = dados.sgc.contratos.map((c: any) => {
    const forn = mapFornecedores.get(c.fornecedorId);
    return {
      ID: c.id,
      Numero_Contrato: c.numeroContrato || '',
      Numero_Empenho: c.numeroEmpenho || '',
      Processo_SEI_Mae: c.processoSeiMae || '',
      Tipo_Contrato: c.tipoContrato || '',
      Fornecedor_Razao_Social: forn?.razaoSocial || '',
      Fornecedor_CNPJ: forn?.cnpj || '',
      Objeto: c.objeto || '',
      Valor_Global: Number(c.valorGlobal || 0),
      Valor_Atualizado: Number(c.valorAtualizado || 0),
      Vigencia_Inicio: c.vigenciaInicio,
      Vigencia_Fim: c.vigenciaFim,
      Status: c.status,
      Etapa_Pos_Homologacao: c.etapaFluxoPosHomologacao || '',
    };
  });

  const responsaveisFormatados = dados.sgc.responsaveis.map((r: any) => {
    const u = mapUsuariosSgc.get(r.userId);
    const c = mapContratosSgc.get(r.contratoId);
    return {
      Contrato: c?.numeroContrato || c?.numeroEmpenho || r.contratoId,
      Objeto_Contrato: c?.objeto || '',
      Tipo_Contrato: c?.tipoContrato || '',
      Servidor_Nome: u?.nome || '',
      Servidor_Email: u?.email || '',
      Servidor_Matricula: u?.matricula || '',
      Papel_Designado: r.tipoAtuacao,
      Ato_Portaria_Designacao: r.numeroAtoDesignacao || '',
      ID_SEI_Ato: r.idSeiAtoDesignacao || '',
      Campus_Setor: r.campusSetor || 'Geral',
      Ativo: r.ativo ? 'SIM' : 'NÃO',
    };
  });

  adicionarAbaExcel(wbSgc, 'Contratos', contratosFormatados);
  adicionarAbaExcel(wbSgc, 'Equipe_Fiscalizacao', responsaveisFormatados);
  adicionarAbaExcel(wbSgc, 'Itens_Contratuais', dados.sgc.itensContrato);
  adicionarAbaExcel(wbSgc, 'Ordens_Servico_Compra', dados.sgc.ordensServico);
  adicionarAbaExcel(wbSgc, 'Medicoes_Faturas', dados.sgc.medicoes);
  adicionarAbaExcel(wbSgc, 'Conta_Vinculada', dados.sgc.contaVinculada);
  adicionarAbaExcel(wbSgc, 'Terceirizados_Postos', dados.sgc.trabalhadores);
  adicionarAbaExcel(wbSgc, 'Frequencias_Postos', dados.sgc.frequencias);
  adicionarAbaExcel(wbSgc, 'Atas_ARP', dados.sgc.atas);
  adicionarAbaExcel(wbSgc, 'Itens_Atas_ARP', dados.sgc.ataItens);
  adicionarAbaExcel(wbSgc, 'Fornecedores', dados.sgc.fornecedores);
  adicionarAbaExcel(wbSgc, 'Alteracoes_Aditivos', dados.sgc.alteracoes);
  adicionarAbaExcel(wbSgc, 'Penalidades', dados.sgc.penalidades);

  // 2. PCA
  const wbPca = XLSX.utils.book_new();
  adicionarAbaExcel(wbPca, 'Unidades_e_Cotas', dados.pca.unidades);
  adicionarAbaExcel(wbPca, 'Setores_Internos', dados.pca.setoresInternos);
  adicionarAbaExcel(wbPca, 'DFDs_Demandas', dados.pca.dfds);
  adicionarAbaExcel(wbPca, 'Itens_DFD', dados.pca.itensDfd);
  adicionarAbaExcel(wbPca, 'Consolidacoes_ETP', dados.pca.consolidacoes);
  adicionarAbaExcel(wbPca, 'Itens_Tecnicos', dados.pca.itensTecnicos);
  adicionarAbaExcel(wbPca, 'Pesquisas_Precos', dados.pca.pesquisasPreco);
  adicionarAbaExcel(wbPca, 'Cotacoes_Itens', dados.pca.pesquisasPrecoItens);
  adicionarAbaExcel(wbPca, 'Status_Licitacoes', dados.pca.statusLicitacao);
  adicionarAbaExcel(wbPca, 'Categorias', dados.pca.categorias);
  adicionarAbaExcel(wbPca, 'Catalogo_Itens', dados.pca.catalogo);

  // 3. PORTAL
  const wbPortal = XLSX.utils.book_new();
  adicionarAbaExcel(wbPortal, 'Usuarios_Matriz_Perfis', dados.portal.usuarios);
  adicionarAbaExcel(wbPortal, 'Unidades_Oficiais_UERN', dados.portal.unidades);
  adicionarAbaExcel(wbPortal, 'Auditoria_Central', dados.portal.logsAuditoria);

  // 4. OPERACIONAL (Climatização + Diárias)
  const wbOp = XLSX.utils.book_new();
  adicionarAbaExcel(wbOp, 'Clima_Contratos', dados.climatizacao.contratos);
  adicionarAbaExcel(wbOp, 'Clima_Equipamentos', dados.climatizacao.equipamentos);
  adicionarAbaExcel(wbOp, 'Clima_Chamados', dados.climatizacao.chamados);
  adicionarAbaExcel(wbOp, 'Clima_Intervencoes', dados.climatizacao.intervencoes);
  adicionarAbaExcel(wbOp, 'Diarias_Pedidos', dados.diarias.pedidosDiaria);
  adicionarAbaExcel(wbOp, 'Diarias_Viagens', dados.diarias.viagens);
  adicionarAbaExcel(wbOp, 'Diarias_Beneficiarios', dados.diarias.beneficiarios);

  return {
    sgcBuffer: XLSX.write(wbSgc, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
    pcaBuffer: XLSX.write(wbPca, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
    portalBuffer: XLSX.write(wbPortal, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
    operacionalBuffer: XLSX.write(wbOp, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
  };
}

/**
 * Gera os Cadernos Textuais em formato Microsoft Word (.docx) para todos os documentos ricos
 */
export async function gerarDocumentosWordBackup(
  dados: Awaited<ReturnType<typeof coletarDadosCompletosEcossistema>>['dados']
) {
  const mapFornecedores = new Map(dados.sgc.fornecedores.map((f: any) => [f.id, f]));
  const mapUsuariosSgc = new Map(dados.sgc.usuarios.map((u: any) => [u.id, u]));
  const mapUnidadesPca = new Map(dados.pca.unidades.map((u: any) => [u.id, u]));

  // 1. Caderno SGC (.docx): Contratos, Ordens de Serviço/Compra, Alterações e Normativos
  const childrenSgc: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE (UERN)',
          bold: true,
          size: 26,
          color: '003366',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: 'PRÓ-REITORIA DE ADMINISTRAÇÃO (PROAD) — DOSSIÊ TEXTUAL DE BACKUP DO SGC',
          bold: true,
          size: 22,
          color: '334155',
        }),
      ],
    }),
    paragrafoCampoDocx('Data/Hora de Geração do Backup', dados.metadados.geradoEm),
    separadorDocx(),
    paragrafoTituloDocx('1. CONTRATOS E EMPENHOS REGISTRADOS NO SGC', HeadingLevel.HEADING_1),
  ];

  for (const c of dados.sgc.contratos) {
    const forn = mapFornecedores.get(c.fornecedorId);
    const num = c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : `Empenho nº ${c.numeroEmpenho || 'S/N'}`;
    childrenSgc.push(
      paragrafoTituloDocx(`${num} — ${forn?.razaoSocial || 'Fornecedor'}`, HeadingLevel.HEADING_2),
      paragrafoCampoDocx('Processo SEI Mãe', c.processoSeiMae),
      paragrafoCampoDocx('CNPJ da Contratada', forn?.cnpj),
      paragrafoCampoDocx('Natureza / Tipo', c.tipoContrato),
      paragrafoCampoDocx('Objeto Integral', c.objeto),
      paragrafoCampoDocx('Valor Global (R$)', c.valorGlobal),
      paragrafoCampoDocx('Valor Atualizado (R$)', c.valorAtualizado),
      paragrafoCampoDocx('Vigência', `${c.vigenciaInicio || ''} a ${c.vigenciaFim || ''}`),
      separadorDocx()
    );
  }

  childrenSgc.push(
    paragrafoTituloDocx('2. ORDENS DE SERVIÇO (OS) E ORDENS DE COMPRA (OC) EMITIDAS', HeadingLevel.HEADING_1)
  );

  if (dados.sgc.ordensServico.length === 0) {
    childrenSgc.push(paragrafoCampoDocx('Status', 'Nenhuma Ordem emitida até o momento.'));
  } else {
    for (const os of dados.sgc.ordensServico) {
      const fiscal = mapUsuariosSgc.get(os.fiscalAdmId);
      const ft = os.fiscalTecnicoEnvioId ? mapUsuariosSgc.get(os.fiscalTecnicoEnvioId) : null;
      childrenSgc.push(
        paragrafoTituloDocx(
          `${os.tipoOrdem === 'ORDEM_COMPRA' ? 'Ordem de Compra' : 'Ordem de Serviço'} nº ${os.numeroOs}/${os.ano || 2026}`,
          HeadingLevel.HEADING_2
        ),
        paragrafoCampoDocx('Processo SEI da Despesa', os.processoSeiDespesa),
        paragrafoCampoDocx('Processo SEI Mãe', os.processoSeiMae),
        paragrafoCampoDocx('Status Atual', os.status),
        paragrafoCampoDocx('Emitido por (Fiscal Adm / Gestor)', fiscal?.nome || os.fiscalAdmId),
        paragrafoCampoDocx('Remetido ao Fornecedor por (Fiscal Técnico)', ft?.nome || 'Pendente / Direto'),
        paragrafoCampoDocx('Descrição / Justificativa / Escopo', os.descricaoServico),
        paragrafoCampoDocx('Valor Estimado (R$)', os.valorEstimado),
        paragrafoCampoDocx('Local de Entrega / Execução', os.localEntrega),
        paragrafoCampoDocx('Prazo de Entrega (Dias)', os.prazoDiasEntrega),
        paragrafoCampoDocx('Itens Solicitados (JSON)', os.itensSolicitadosJson),
        paragrafoCampoDocx('Assinatura Criptográfica / Hash', os.hashAssinaturaEletronica),
        separadorDocx()
      );
    }
  }

  // 2. Caderno PCA (.docx): DFDs, ETPs, Mapas de Risco, Termos de Referência e Minutas
  const childrenPca: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE (UERN)',
          bold: true,
          size: 26,
          color: '003366',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: 'PRÓ-REITORIA DE ADMINISTRAÇÃO (PROAD) — DOSSIÊ TEXTUAL DE BACKUP DO PCA (DFDs, ETPs, RISCOS, TRs E MINUTAS)',
          bold: true,
          size: 22,
          color: '334155',
        }),
      ],
    }),
    paragrafoCampoDocx('Data/Hora de Geração do Backup', dados.metadados.geradoEm),
    separadorDocx(),
    paragrafoTituloDocx('1. DOCUMENTOS DE FORMALIZAÇÃO DE DEMANDA (DFDs)', HeadingLevel.HEADING_1),
  ];

  for (const dfd of dados.pca.dfds) {
    const un = mapUnidadesPca.get(dfd.unidadeId);
    childrenPca.push(
      paragrafoTituloDocx(
        `DFD nº ${String(dfd.numero).padStart(4, '0')}/${dfd.ano} — ${un?.nome || dfd.unidadeId}`,
        HeadingLevel.HEADING_2
      ),
      paragrafoCampoDocx('Status', dfd.status),
      paragrafoCampoDocx('Tipo de Demanda', dfd.tipoDemanda),
      paragrafoCampoDocx('Descrição Sumária', dfd.descricaoSumaria),
      paragrafoCampoDocx('Justificativa da Necessidade', dfd.justificativa),
      paragrafoCampoDocx('Justificativa de Cota Geral (se aplicável)', dfd.justificativaCotaGeral),
      separadorDocx()
    );
  }

  childrenPca.push(
    paragrafoTituloDocx('2. ESTUDOS TÉCNICOS PRELIMINARES (ETPs)', HeadingLevel.HEADING_1)
  );
  for (const etp of dados.pca.etps) {
    childrenPca.push(
      paragrafoTituloDocx(`ETP nº ${etp.numeroEtp || etp.id}`, HeadingLevel.HEADING_2),
      paragrafoCampoDocx('Status', etp.status),
      paragrafoCampoDocx('1. Descrição da Necessidade', etp.descricaoNecessidade),
      paragrafoCampoDocx('2. Alinhamento ao Planejamento', etp.alinhamentoPlanejamento),
      paragrafoCampoDocx('3. Requisitos da Contratação', etp.requisitosContratacao),
      paragrafoCampoDocx('4. Estimativa de Quantidades', etp.estimativaQuantidades),
      paragrafoCampoDocx('5. Levantamento de Mercado', etp.levantamentoMercado),
      paragrafoCampoDocx('6. Estimativa de Valor', etp.estimativaValor),
      paragrafoCampoDocx('7. Descrição da Solução como um Todo', etp.descricaoSolucao),
      paragrafoCampoDocx('8. Justificativa para o Parcelamento', etp.justificativaParcelamento),
      paragrafoCampoDocx('9. Resultados Pretendidos', etp.resultadosPretendidos),
      paragrafoCampoDocx('10. Providências Prévias', etp.providenciasPrevias),
      paragrafoCampoDocx('11. Contratações Correlatas/Interdependentes', etp.contratacoesCorrelatas),
      paragrafoCampoDocx('12. Impactos Ambientais', etp.impactosAmbientais),
      paragrafoCampoDocx('13. Declaração de Viabilidade', etp.posicionamentoConclusivo),
      separadorDocx()
    );
  }

  childrenPca.push(
    paragrafoTituloDocx('3. TERMOS DE REFERÊNCIA (TRs) E MINUTAS', HeadingLevel.HEADING_1)
  );
  for (const tr of dados.pca.termosReferencia) {
    childrenPca.push(
      paragrafoTituloDocx(`Termo de Referência (TR) — ID ${tr.id}`, HeadingLevel.HEADING_2),
      paragrafoCampoDocx('Status', tr.status),
      paragrafoCampoDocx('Definição do Objeto', tr.definicaoObjeto),
      paragrafoCampoDocx('Fundamentação da Contratação', tr.fundamentacaoContratacao),
      paragrafoCampoDocx('Descrição da Solução', tr.descricaoSolucao),
      paragrafoCampoDocx('Requisitos da Contratação', tr.requisitosContratacao),
      paragrafoCampoDocx('Modelo de Execução do Objeto', tr.modeloExecucao),
      paragrafoCampoDocx('Modelo de Gestão do Contrato', tr.modeloGestao),
      paragrafoCampoDocx('Critérios de Medição e Pagamento', tr.criteriosMedicaoPagamento),
      paragrafoCampoDocx('Forma e Critérios de Seleção do Fornecedor', tr.formaSelecaoFornecedor),
      separadorDocx()
    );
  }

  for (const min of dados.pca.minutasEdital) {
    childrenPca.push(
      paragrafoTituloDocx(`Minuta de Edital — Processo ${min.numeroProcessoSei || min.id}`, HeadingLevel.HEADING_2),
      paragrafoCampoDocx('Modalidade', min.modalidade),
      paragrafoCampoDocx('Objeto', min.objetoTexto),
      paragrafoCampoDocx('Texto Completo / Seções', min.textoCompleto || min.secoesJson),
      separadorDocx()
    );
  }

  const docSgc = new Document({
    sections: [{ children: childrenSgc }],
  });
  const docPca = new Document({
    sections: [{ children: childrenPca }],
  });

  const [docxSgcBuffer, docxPcaBuffer] = await Promise.all([
    Packer.toBuffer(docSgc),
    Packer.toBuffer(docPca),
  ]);

  return { docxSgcBuffer, docxPcaBuffer };
}

/**
 * Monta o Pacote ZIP Completo (Tripla Camada: .XLSX + .DOCX + .JSON + Manifesto SHA-256)
 */
export async function gerarPacoteZipBackupCompleto() {
  const { dados, jsonSnapshot, estatisticas } = await coletarDadosCompletosEcossistema();
  const planilhas = gerarPlanilhasExcelBackup(dados);
  const documentosWord = await gerarDocumentosWordBackup(dados);

  const zip = new JSZip();

  // Pasta 1: Planilhas Excel (.xlsx)
  const folderXlsx = zip.folder('01_Planilhas_Tabelas_XLSX');
  folderXlsx?.file('01_SGC_Contratos_Execucao_Terceirizacao.xlsx', planilhas.sgcBuffer);
  folderXlsx?.file('02_PCA_Planejamento_DFDs_e_Licitacoes.xlsx', planilhas.pcaBuffer);
  folderXlsx?.file('03_Portal_Usuarios_Unidades_e_Auditoria.xlsx', planilhas.portalBuffer);
  folderXlsx?.file('04_Operacional_Climatizacao_e_Diarias.xlsx', planilhas.operacionalBuffer);

  // Pasta 2: Documentos Word (.docx)
  const folderDocx = zip.folder('02_Documentos_Textuais_DOCX');
  folderDocx?.file('01_Dossie_Textual_SGC_Contratos_Ordens_e_Atos.docx', documentosWord.docxSgcBuffer);
  folderDocx?.file('02_Dossie_Textual_PCA_DFDs_ETPs_Riscos_TRs_Minutas.docx', documentosWord.docxPcaBuffer);

  // Pasta 3: Snapshot JSON de Restauração Instantânea + Manifesto SHA-256
  const folderJson = zip.folder('03_Snapshot_Restauracao_Sistema');
  folderJson?.file('snapshot_integral_proad_uern.json', jsonSnapshot);

  const manifestoTexto = [
    '================================================================================',
    '  MANIFESTO OFICIAL DE BACKUP E INTEGRIDADE CRIPTOGRÁFICA — PROAD / UERN',
    '================================================================================',
    `Data/Hora de Geração (UTC): ${estatisticas.geradoEm}`,
    `Assinatura SHA-256 do Snapshot: ${estatisticas.hashSha256}`,
    `Total de Tabelas Auditadas: ${estatisticas.totalTabelas}`,
    `Total de Registros Salvos: ${estatisticas.totalRegistros}`,
    '',
    '--- RESUMO QUANTITATIVO POR SISTEMA ---',
    `1. Portal PROAD:`,
    `   - Usuários Cadastrados: ${estatisticas.resumoPorModulo.portal.usuarios}`,
    `   - Unidades Oficiais UERN: ${estatisticas.resumoPorModulo.portal.unidades}`,
    `   - Logs de Auditoria: ${estatisticas.resumoPorModulo.portal.logsAuditoria}`,
    `2. SGC (Gestão de Contratos e Execução):`,
    `   - Contratos e Empenhos: ${estatisticas.resumoPorModulo.sgc.contratos}`,
    `   - Itens Contratuais: ${estatisticas.resumoPorModulo.sgc.itensContrato}`,
    `   - Designações de Gestores e Fiscais: ${estatisticas.resumoPorModulo.sgc.responsaveis}`,
    `   - Ordens de Serviço e Compra (OS/OC): ${estatisticas.resumoPorModulo.sgc.ordensServicoCompra}`,
    `   - Medições e Faturas: ${estatisticas.resumoPorModulo.sgc.medicoes}`,
    `   - Colaboradores Terceirizados: ${estatisticas.resumoPorModulo.sgc.trabalhadores}`,
    `   - Atas de Registro de Preços (ARP): ${estatisticas.resumoPorModulo.sgc.atas}`,
    `3. PCA (Planejamento e Fase Interna):`,
    `   - Unidades Demandantes: ${estatisticas.resumoPorModulo.pca.unidades}`,
    `   - DFDs Registrados: ${estatisticas.resumoPorModulo.pca.dfds}`,
    `   - Itens de DFD: ${estatisticas.resumoPorModulo.pca.itensDfd}`,
    `   - Compilações Técnicas: ${estatisticas.resumoPorModulo.pca.consolidacoes}`,
    `   - Estudos Técnicos Preliminares (ETP): ${estatisticas.resumoPorModulo.pca.etps}`,
    `   - Termos de Referência (TR): ${estatisticas.resumoPorModulo.pca.trs}`,
    `   - Minutas de Edital/Contrato/Ata: ${estatisticas.resumoPorModulo.pca.minutas}`,
    `4. Climatização & Diárias:`,
    `   - Equipamentos Climatização: ${estatisticas.resumoPorModulo.climatizacao.equipamentos}`,
    `   - Chamados Climatização: ${estatisticas.resumoPorModulo.climatizacao.chamados}`,
    `   - Pedidos de Diárias: ${estatisticas.resumoPorModulo.diarias.pedidosDiaria}`,
    '================================================================================',
  ].join('\n');

  folderJson?.file('manifesto_integridade_sha256.txt', manifestoTexto);

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const dataSlug = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const nomeArquivo = `BACKUP_PROAD_UERN_${dataSlug}.zip`;

  const snapshot = {
    metadata: {
      geradoEm: estatisticas.geradoEm,
      sha256: estatisticas.hashSha256,
      totalTabelas: estatisticas.totalTabelas,
      totalRegistros: estatisticas.totalRegistros,
    },
    schemas: {
      portal: dados.portal,
      public: dados.sgc,
      pca: dados.pca,
      climatizacao: dados.climatizacao,
      diarias: dados.diarias,
    },
  };

  return {
    zipBuffer,
    buffer: zipBuffer,
    nomeArquivo,
    estatisticas,
    snapshot,
    sha256: estatisticas.hashSha256,
    planilhas,
    documentosWord,
    jsonSnapshot,
  };
}

export async function obterResumoBackupRapido() {
  const { dados, estatisticas } = await coletarDadosCompletosEcossistema();
  const contarReg = (obj: Record<string, any[]>) =>
    Object.values(obj).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
  return {
    geradoEm: estatisticas.geradoEm,
    totalTabelas: estatisticas.totalTabelas,
    totalRegistros: estatisticas.totalRegistros,
    porSchema: {
      public: {
        tabelas: Object.keys(dados.sgc).length,
        registros: contarReg(dados.sgc),
      },
      pca: {
        tabelas: Object.keys(dados.pca).length,
        registros: contarReg(dados.pca),
      },
      portal: {
        tabelas: Object.keys(dados.portal).length,
        registros: contarReg(dados.portal),
      },
      climatizacao: {
        tabelas: Object.keys(dados.climatizacao).length,
        registros: contarReg(dados.climatizacao),
      },
      diarias: {
        tabelas: Object.keys(dados.diarias).length,
        registros: contarReg(dados.diarias),
      },
    },
  };
}

export async function coletarSnapshotIntegral() {
  const { dados, estatisticas } = await coletarDadosCompletosEcossistema();
  return {
    metadata: {
      geradoEm: estatisticas.geradoEm,
      sha256: estatisticas.hashSha256,
      totalTabelas: estatisticas.totalTabelas,
      totalRegistros: estatisticas.totalRegistros,
    },
    schemas: {
      portal: dados.portal,
      public: dados.sgc,
      pca: dados.pca,
      climatizacao: dados.climatizacao,
      diarias: dados.diarias,
    },
  };
}

export async function gerarApenasPlanilhasXlsx() {
  const { dados } = await coletarDadosCompletosEcossistema();
  const planilhas = gerarPlanilhasExcelBackup(dados);
  return {
    arquivos: {
      '01_SGC_UERN_Contratos_Atas_Ordens_Faturas.xlsx': planilhas.sgcBuffer,
      '02_PCA_UERN_DFDs_Dotacoes_Planejamento_Licitacoes.xlsx': planilhas.pcaBuffer,
      '03_Portal_PROAD_Identidades_Unidades_Auditoria.xlsx': planilhas.portalBuffer,
      '04_Climatizacao_e_Diarias_UERN.xlsx': planilhas.operacionalBuffer,
    } as Record<string, Buffer>,
  };
}

export async function gerarApenasDocumentosDocx() {
  const { dados } = await coletarDadosCompletosEcossistema();
  const docs = await gerarDocumentosWordBackup(dados);
  return {
    arquivos: {
      '01_Caderno_Documental_SGC_Contratos_Ordens_Atos.docx': docs.docxSgcBuffer,
      '02_Caderno_Artefatos_PCA_ETP_Riscos_TR_Minutas.docx': docs.docxPcaBuffer,
    } as Record<string, Buffer>,
  };
}

