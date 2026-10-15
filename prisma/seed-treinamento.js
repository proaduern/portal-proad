/**
 * Script de Verificação de Integridade das Unidades e Perfis no Portal Central
 * Garante que as 22 unidades oficiais da UERN estejam cadastradas e nunca sejam deletadas.
 */

const { PrismaClient } = require('@prisma/client');

const connectionUrl =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_U3vzx7PrcCna@ep-still-butterfly-acl9x8uu-pooler.sa-east-1.aws.neon.tech/neondb?schema=portal&sslmode=require&channel_binding=require&pgbouncer=true';

const prisma = new PrismaClient({
  datasources: {
    db: { url: connectionUrl },
  },
});

const UNIDADES_OFICIAIS = [
  { codigo: '010', sigla: 'PROAD', nome: 'Pró-Reitoria de Administração', campus: 'Mossoró', email: 'proad@uern.br', predioNome: 'Edifício Reitoria' },
  { codigo: '001', sigla: 'REITORIA', nome: 'Gabinete da Reitoria', campus: 'Mossoró', email: 'reitoria@uern.br', predioNome: 'Edifício Reitoria' },
  { codigo: '011', sigla: 'PROEG', nome: 'Pró-Reitoria de Ensino de Graduação', campus: 'Mossoró', email: 'proeg@uern.br', predioNome: 'Edifício Reitoria' },
  { codigo: '012', sigla: 'PROPEG', nome: 'Pró-Reitoria de Pesquisa e Pós-Graduação', campus: 'Mossoró', email: 'propeg@uern.br', predioNome: 'Edifício Reitoria' },
  { codigo: '013', sigla: 'PROEX', nome: 'Pró-Reitoria de Extensão', campus: 'Mossoró', email: 'proex@uern.br', predioNome: 'Edifício Reitoria' },
  { codigo: '014', sigla: 'PRAE', nome: 'Pró-Reitoria de Assuntos Estudantis', campus: 'Mossoró', email: 'prae@uern.br', predioNome: 'Centro de Convivência' },
  { codigo: '015', sigla: 'PROPLAN', nome: 'Pró-Reitoria de Planejamento, Orçamento e Finanças', campus: 'Mossoró', email: 'proplan@uern.br', predioNome: 'Edifício Reitoria' },
  { codigo: '020', sigla: 'DINF', nome: 'Diretoria de Informatização', campus: 'Mossoró', email: 'dinf@uern.br', predioNome: 'Prédio DINF / CPD' },
  { codigo: '025', sigla: 'SOBE', nome: 'Setor de Obras e Manutenção Predial', campus: 'Mossoró', email: 'sobe@uern.br', predioNome: 'Almoxarifado Central' },
  { codigo: '101', sigla: 'FAFIC', nome: 'Faculdade de Filosofia e Ciências Sociais', campus: 'Mossoró', email: 'fafic@uern.br', predioNome: 'Bloco FAFIC' },
  { codigo: '102', sigla: 'FANAT', nome: 'Faculdade de Ciências Exatas e Naturais', campus: 'Mossoró', email: 'fanat@uern.br', predioNome: 'Bloco FANAT' },
  { codigo: '103', sigla: 'FAE', nome: 'Faculdade de Educação', campus: 'Mossoró', email: 'fae@uern.br', predioNome: 'Bloco FAE' },
  { codigo: '104', sigla: 'FACS', nome: 'Faculdade de Ciências da Saúde', campus: 'Mossoró', email: 'facs@uern.br', predioNome: 'Complexo FACS' },
  { codigo: '105', sigla: 'FAD', nome: 'Faculdade de Direito', campus: 'Mossoró', email: 'fad@uern.br', predioNome: 'Bloco FAD' },
  { codigo: '106', sigla: 'FASSO', nome: 'Faculdade de Serviço Social', campus: 'Mossoró', email: 'fasso@uern.br', predioNome: 'Bloco FASSO' },
  { codigo: '107', sigla: 'FAEN', nome: 'Faculdade de Enfermagem', campus: 'Mossoró', email: 'faen@uern.br', predioNome: 'Bloco FAEN' },
  { codigo: '108', sigla: 'FE', nome: 'Faculdade de Educação Física', campus: 'Mossoró', email: 'fe@uern.br', predioNome: 'Ginásio e Complexo Esportivo' },
  { codigo: '201', sigla: 'CAMPUS-ASSU', nome: 'Campus Avançado Prefeito Walter de Sá Leitão', campus: 'Assú', email: 'campus.assu@uern.br', predioNome: 'Campus Assú' },
  { codigo: '202', sigla: 'CAMPUS-CAICO', nome: 'Campus de Caicó', campus: 'Caicó', email: 'campus.caico@uern.br', predioNome: 'Campus Caicó' },
  { codigo: '203', sigla: 'CAMPUS-PATU', nome: 'Campus Avançado de Patu', campus: 'Patu', email: 'campus.patu@uern.br', predioNome: 'Campus Patu' },
  { codigo: '204', sigla: 'CAMPUS-PAU-FERROS', nome: 'Campus Avançado de Pau dos Ferros', campus: 'Pau dos Ferros', email: 'campus.pauferros@uern.br', predioNome: 'Campus Pau dos Ferros' },
  { codigo: '205', sigla: 'CAMPUS-NATAL', nome: 'Complexo Cultural / Campus de Natal', campus: 'Natal', email: 'campus.natal@uern.br', predioNome: 'Campus Natal - Zona Norte' },
];

async function runSeedPortalTreinamento() {
  console.log('--- VERIFICAÇÃO E INTEGRIDADE DO PORTAL CENTRAL PROAD UERN ---');

  // NUNCA deletar tabelas centrais! Apenas garantir as 22 unidades oficiais.
  for (const u of UNIDADES_OFICIAIS) {
    await prisma.unidadeCentral.upsert({
      where: { sigla: u.sigla },
      update: {
        codigo: u.codigo,
        nome: u.nome,
        campus: u.campus,
        email: u.email,
        predioNome: u.predioNome,
        ativo: true,
      },
      create: {
        codigo: u.codigo,
        sigla: u.sigla,
        nome: u.nome,
        campus: u.campus,
        email: u.email,
        predioNome: u.predioNome,
        ativo: true,
      },
    });
  }

  console.log('Catálogo de 22 unidades oficiais verificado com sucesso.');
}

module.exports = { runSeedPortalTreinamento };

if (require.main === module) {
  runSeedPortalTreinamento()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
