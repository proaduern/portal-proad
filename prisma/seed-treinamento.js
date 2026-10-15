/**
 * Script de Seed do Portal Central para o Ambiente de Treinamento e Capacitação
 * Schema: portal_treinamento no Neon PostgreSQL
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const connectionUrl =
  process.env.DATABASE_URL_TREINAMENTO ||
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_U3vzx7PrcCna@ep-still-butterfly-acl9x8uu-pooler.sa-east-1.aws.neon.tech/neondb?schema=portal_treinamento&sslmode=require&channel_binding=require&pgbouncer=true';

const prisma = new PrismaClient({
  datasources: {
    db: { url: connectionUrl },
  },
});

async function runSeedPortalTreinamento() {
  console.log('--- INICIANDO SEED DO PORTAL DE TREINAMENTO (PROAD UERN) ---');

  // 1. Limpeza segura de dados de treinamento anteriores
  try {
    console.log('Limpando usuários anteriores de treinamento...');
    await prisma.usuarioCentral.deleteMany({});
    await prisma.unidadeCentral.deleteMany({});
    console.log('Limpeza do portal concluída.');
  } catch (err) {
    console.log('Aviso ao limpar tabelas do portal:', err.message);
  }

  // 2. Unidades Oficiais da UERN
  console.log('Cadastrando unidades simuladas...');
  const unidades = [
    { codigo: '010', sigla: 'PROAD', nome: 'Pró-Reitoria de Administração (Treinamento)', campus: 'Mossoró', email: 'proad@uern.br', predioNome: 'Edifício Reitoria' },
    { codigo: '025', sigla: 'SOBE', nome: 'Setor de Obras e Manutenção Predial (Treinamento)', campus: 'Mossoró', email: 'sobe@uern.br', predioNome: 'Almoxarifado Central' },
    { codigo: '020', sigla: 'DINF', nome: 'Diretoria de Informatização (Treinamento)', campus: 'Mossoró', email: 'dinf@uern.br', predioNome: 'Prédio DINF / CPD' },
    { codigo: '101', sigla: 'FAFIC', nome: 'Faculdade de Filosofia e Ciências Sociais (Treinamento)', campus: 'Mossoró', email: 'fafic@uern.br', predioNome: 'Bloco FAFIC' },
    { codigo: '201', sigla: 'CAMPUS-ASSU', nome: 'Campus Avançado de Assú (Treinamento)', campus: 'Assú', email: 'campus.assu@uern.br', predioNome: 'Campus Assú' },
    { codigo: '204', sigla: 'CAMPUS-PAU-FERROS', nome: 'Campus de Pau dos Ferros (Treinamento)', campus: 'Pau dos Ferros', email: 'campus.pauferros@uern.br', predioNome: 'Campus Pau dos Ferros' },
  ];

  const unidadesCriadas = {};
  for (const u of unidades) {
    unidadesCriadas[u.sigla] = await prisma.unidadeCentral.upsert({
      where: { sigla: u.sigla },
      update: u,
      create: u,
    });
  }

  // Senha padrão didática
  const senhaPadrao = await bcrypt.hash('Treino@2026', 10);

  // 3. Perfis Didáticos Transversais (Mesmos usados no SIG-CLIMA, SGC, PCA, etc.)
  console.log('Cadastrando perfis didáticos integrados para as turmas...');

  // 3.1 Aluno Demandante
  await prisma.usuarioCentral.upsert({
    where: { email: 'aluno.demandante@uern.br' },
    update: {},
    create: {
      tipoUsuario: 'SERVIDOR_UERN',
      status: 'ATIVO',
      nome: 'Aluno Demandante (Profª Fátima Souza)',
      email: 'aluno.demandante@uern.br',
      cpf: '000.111.222-33',
      matricula: 'TR-1001-0',
      telefone: '(84) 98888-0001',
      senhaHash: senhaPadrao,
      unidadeId: unidadesCriadas['FAFIC'].id,
      perfilSgc: 'DEMANDANTE',
      perfilManut: 'DEMANDANTE',
      perfilPca: 'UNIDADE',
      permissoesPca: { podeCriarDfd: true, podeEditarDfd: true, podeEnviarDfd: true },
      perfilDiarias: 'DEMANDANTE',
      perfilClimatizacao: 'DEMANDANTE',
      aprovadoEm: new Date(),
      aprovadoPor: 'INSTRUTOR_PROAD',
    },
  });

  // 3.2 Aluno Fiscal Técnico
  await prisma.usuarioCentral.upsert({
    where: { email: 'aluno.fiscal.tec@uern.br' },
    update: {},
    create: {
      tipoUsuario: 'SERVIDOR_UERN',
      status: 'ATIVO',
      nome: 'Aluno Fiscal Técnico (Eng. Carlos Eduardo)',
      email: 'aluno.fiscal.tec@uern.br',
      cpf: '000.222.333-44',
      matricula: 'TR-2002-0',
      telefone: '(84) 98888-0002',
      senhaHash: senhaPadrao,
      unidadeId: unidadesCriadas['SOBE'].id,
      perfilSgc: 'FISCAL_TECNICO',
      perfilManut: 'FISCAL_TECNICO',
      perfilPca: 'UNIDADE',
      permissoesPca: { podeCriarDfd: true },
      perfilDiarias: 'DEMANDANTE',
      perfilClimatizacao: 'FISCAL_TECNICO',
      aprovadoEm: new Date(),
      aprovadoPor: 'INSTRUTOR_PROAD',
    },
  });

  // 3.3 Aluno Fiscal Administrativo / Gestor
  await prisma.usuarioCentral.upsert({
    where: { email: 'aluno.fiscal.adm@uern.br' },
    update: {},
    create: {
      tipoUsuario: 'SERVIDOR_UERN',
      status: 'ATIVO',
      nome: 'Aluno Fiscal Administrativo (Dra. Renata Medeiros)',
      email: 'aluno.fiscal.adm@uern.br',
      cpf: '000.333.444-55',
      matricula: 'TR-3003-0',
      telefone: '(84) 98888-0003',
      senhaHash: senhaPadrao,
      unidadeId: unidadesCriadas['PROAD'].id,
      perfilSgc: 'FISCAL_ADM',
      perfilManut: 'FISCAL_ADM',
      perfilPca: 'ADMIN',
      permissoesPca: { podeCriarDfd: true, podeEditarDfd: true, podeEnviarDfd: true },
      perfilDiarias: 'APROVADOR',
      perfilClimatizacao: 'FISCAL_ADM',
      aprovadoEm: new Date(),
      aprovadoPor: 'INSTRUTOR_PROAD',
    },
  });

  // 3.4 Aluno Empresa Contratada
  await prisma.usuarioCentral.upsert({
    where: { email: 'aluno.empresa@prestadora.com' },
    update: {},
    create: {
      tipoUsuario: 'FORNECEDOR_EXTERNO',
      status: 'ATIVO',
      nome: 'Roberto Silva (Preposto ECOCLIMA)',
      email: 'aluno.empresa@prestadora.com',
      cpf: '000.444.555-66',
      cnpjEmpresa: '99.999.999/0001-99',
      razaoSocial: 'ECOCLIMA SERVIÇOS TÉCNICOS LTDA (TREINAMENTO)',
      nomeFantasia: 'ECOCLIMA TREINAMENTO',
      cargoPreposto: 'Preposto / Engenheiro Responsável',
      telefone: '(84) 98888-0004',
      senhaHash: senhaPadrao,
      perfilSgc: 'FORNECEDOR',
      perfilManut: 'EMPRESA',
      perfilClimatizacao: 'EMPRESA',
      aprovadoEm: new Date(),
      aprovadoPor: 'INSTRUTOR_PROAD',
    },
  });

  // 3.5 Instrutor / Administrador Geral
  await prisma.usuarioCentral.upsert({
    where: { email: 'aluno.admin@uern.br' },
    update: {},
    create: {
      tipoUsuario: 'SERVIDOR_UERN',
      status: 'ATIVO',
      nome: 'Instrutor PROAD (Administrador Geral)',
      email: 'aluno.admin@uern.br',
      cpf: '000.555.666-77',
      matricula: 'ADM-5005-0',
      telefone: '(84) 3315-2100',
      senhaHash: senhaPadrao,
      unidadeId: unidadesCriadas['PROAD'].id,
      perfilSgc: 'ADMIN_PROAD',
      perfilManut: 'ADMIN',
      perfilPca: 'ADMIN',
      perfilDiarias: 'ADMIN',
      perfilClimatizacao: 'ADMIN',
      permissoesPca: {
        podeCriarDfd: true,
        podeEditarDfd: true,
        podeEnviarDfd: true,
        podeExcluirDfd: true,
        podeSolicitarCatalogo: true,
        podeSolicitarCotaGeral: true,
        podeConfirmarEntrega: true,
        podeGerenciarSetores: true,
        podeEditarDadosUnidade: true,
      },
      aprovadoEm: new Date(),
      aprovadoPor: 'SISTEMA_ORIGEM',
    },
  });

  console.log('--- SEED DO PORTAL DE TREINAMENTO CONCLUÍDO COM SUCESSO! ---');
  console.log('Perfis didáticos prontos para login único e salto SSO.');
}

if (require.main === module) {
  runSeedPortalTreinamento()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('Erro ao executar seed do portal de treinamento:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { runSeedPortalTreinamento };
