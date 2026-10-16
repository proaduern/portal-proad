/**
 * Script de Verificação de Integridade das 47 Unidades Oficiais no Portal Central
 * Garante que o catálogo oficial das 47 unidades da UERN esteja cadastrado e nunca seja deletado.
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

const UNIDADES_47 = [
  // 1. Setores Internos da PROAD
  { codigo: '010-01', sigla: 'ALMOX-PROAD', nome: 'Almoxarifado Central - PROAD', campus: 'Mossoró', email: 'almoxarifado@uern.br', predioNome: 'Almoxarifado Central / Campus Central' },
  { codigo: '010-02', sigla: 'PATRIMONIO-PROAD', nome: 'Setor de Patrimônio - PROAD', campus: 'Mossoró', email: 'patrimonio@uern.br', predioNome: 'Edifício Epílogo de Campos (PROAD)' },
  { codigo: '010-03', sigla: 'TRANSPORTES-PROAD', nome: 'Setor de Transportes - PROAD', campus: 'Mossoró', email: 'transportes@uern.br', predioNome: 'Garagem Central / Campus Central' },
  { codigo: '010-04', sigla: 'DIARIAS-PROAD', nome: 'Setor de Diárias, Passagens e Hospedagens – PROAD', campus: 'Mossoró', email: 'diarias.proad@uern.br', predioNome: 'Edifício Epílogo de Campos (PROAD)' },
  { codigo: '010-05', sigla: 'DIRADM-PROAD', nome: 'Diretoria de Administração e Serviços - PROAD', campus: 'Mossoró', email: 'diradm@uern.br', predioNome: 'Edifício Epílogo de Campos (PROAD)' },

  // 2. Faculdades (Campus Central - Mossoró)
  { codigo: '101', sigla: 'FALA', nome: 'Faculdade de Letras e Artes (FALA)', campus: 'Mossoró', email: 'fala@uern.br', predioNome: 'Bloco FALA - Campus Central' },
  { codigo: '102', sigla: 'FASSO', nome: 'Faculdade de Serviço Social (FASSO)', campus: 'Mossoró', email: 'fasso@uern.br', predioNome: 'Bloco FASSO - Campus Central' },
  { codigo: '103', sigla: 'FAEF', nome: 'Faculdade de Educação Física (FAEF)', campus: 'Mossoró', email: 'faef@uern.br', predioNome: 'Complexo Esportivo / FAEF - Campus Central' },
  { codigo: '104', sigla: 'FAFIC', nome: 'Faculdade de Filosofia e Ciências Sociais (FAFIC)', campus: 'Mossoró', email: 'fafic@uern.br', predioNome: 'Bloco FAFIC - Campus Central' },
  { codigo: '105', sigla: 'FE', nome: 'Faculdade de Educação (FE)', campus: 'Mossoró', email: 'fe@uern.br', predioNome: 'Bloco FE - Campus Central' },
  { codigo: '106', sigla: 'FAD', nome: 'Faculdade de Direito (FAD)', campus: 'Mossoró', email: 'fad@uern.br', predioNome: 'Edifício Epílogo de Campos / FAD' },
  { codigo: '107', sigla: 'FANAT', nome: 'Faculdade de Ciências Exatas e Naturais (FANAT)', campus: 'Mossoró', email: 'fanat@uern.br', predioNome: 'Bloco FANAT - Campus Central' },
  { codigo: '108', sigla: 'FACEM', nome: 'Faculdade de Ciências Econômicas (FACEM)', campus: 'Mossoró', email: 'facem@uern.br', predioNome: 'Bloco FACEM - Campus Central' },
  { codigo: '109', sigla: 'FAEN', nome: 'Faculdade de Enfermagem (FAEN)', campus: 'Mossoró', email: 'faen@uern.br', predioNome: 'Bloco FAEN - Centro' },
  { codigo: '110', sigla: 'FACS', nome: 'Faculdade de Ciências da Saúde (FACS)', campus: 'Mossoró', email: 'facs@uern.br', predioNome: 'Complexo FACS' },

  // 3. Campi Avançados
  { codigo: '201', sigla: 'CAMPUS-PAU-FERROS', nome: 'Campus Avançado de Pau dos Ferros (CAPF)', campus: 'Pau dos Ferros', email: 'pferros@uern.br', predioNome: 'Campus Pau dos Ferros' },
  { codigo: '202', sigla: 'CAMPUS-NATAL', nome: 'Campus Avançado de Natal (CAN)', campus: 'Natal', email: 'natal@uern.br', predioNome: 'Complexo Cultural / Campus Natal' },
  { codigo: '203', sigla: 'CAMPUS-ASSU', nome: 'Campus Avançado de Assú (CAA)', campus: 'Assú', email: 'assu@uern.br', predioNome: 'Campus Assú' },
  { codigo: '204', sigla: 'CAMPUS-CAICO', nome: 'Campus Avançado de Caicó (CAC)', campus: 'Caicó', email: 'caico@uern.br', predioNome: 'Campus Caicó' },
  { codigo: '205', sigla: 'CAMPUS-PATU', nome: 'Campus Avançado de Patu (CAP)', campus: 'Patu', email: 'patu@uern.br', predioNome: 'Campus Patu' },

  // 4. Pró-Reitorias e Gabinete
  { codigo: '011', sigla: 'PROEG', nome: 'Pró-Reitoria de Ensino de Graduação (PROEG)', campus: 'Mossoró', email: 'proeg@uern.br', predioNome: 'Edifício Epílogo de Campos' },
  { codigo: '012', sigla: 'PROPEG', nome: 'Pró-Reitoria de Pesquisa e Pós-Graduação (PROPEG)', campus: 'Mossoró', email: 'propeg@uern.br', predioNome: 'Campus Central' },
  { codigo: '013', sigla: 'PROEX', nome: 'Pró-Reitoria de Extensão (PROEX)', campus: 'Mossoró', email: 'proex@uern.br', predioNome: 'Edifício Epílogo de Campos' },
  { codigo: '014', sigla: 'PROGEP', nome: 'Pró-Reitoria de Gestão de Pessoas (PROGEP)', campus: 'Mossoró', email: 'progep@uern.br', predioNome: 'Edifício Epílogo de Campos' },
  { codigo: '015', sigla: 'PRAE', nome: 'Pró-Reitoria de Assuntos Estudantis (PRAE)', campus: 'Mossoró', email: 'prae@uern.br', predioNome: 'Centro de Convivência - Campus Central' },
  { codigo: '010', sigla: 'PROAD', nome: 'Pró-Reitoria de Administração (PROAD)', campus: 'Mossoró', email: 'adj.proad@uern.br', predioNome: 'Edifício Epílogo de Campos' },

  // 5. Superintendências, Diretorias, Assessorias e Órgãos Suplementares
  { codigo: '020', sigla: 'STI', nome: 'Superintendência de Tecnologia da Informação (STI)', campus: 'Mossoró', email: 'sti@uern.br', predioNome: 'Prédio STI - Campus Central' },
  { codigo: '025', sigla: 'SOBE', nome: 'Superintendência de Obras e Engenharia (SOBE)', campus: 'Mossoró', email: 'sobe@uern.br', predioNome: 'SOBE - Campus Central' },
  { codigo: '030', sigla: 'UERNTV', nome: 'UERN TV - Produção Audiovisual', campus: 'Mossoró', email: 'uerntv@uern.br', predioNome: 'Campus Central' },
  { codigo: '031', sigla: 'AGECOM', nome: 'Agência de Comunicação (AGECOM)', campus: 'Mossoró', email: 'agecom@uern.br', predioNome: 'Edifício Epílogo de Campos' },
  { codigo: '032', sigla: 'DICE', nome: 'Diretoria de Interiorização e Ações Comunitárias (DICE)', campus: 'Mossoró', email: 'dice@uern.br', predioNome: 'Edifício Epílogo de Campos' },
  { codigo: '033', sigla: 'DIRI', nome: 'Diretoria de Relações Internacionais e Interinstitucionais (DIRI)', campus: 'Mossoró', email: 'diri@uern.br', predioNome: 'Campus Central' },
  { codigo: '034', sigla: 'DEAD', nome: 'Diretoria de Educação a Distância (DEaD)', campus: 'Mossoró', email: 'dead@uern.br', predioNome: 'Campus Central' },
  { codigo: '035', sigla: 'DIAAD', nome: 'Diretoria de Ações Afirmativas e Diversidade (DIAAD)', campus: 'Mossoró', email: 'diaad@uern.br', predioNome: 'Campus Central' },
  { codigo: '036', sigla: 'DAIN', nome: 'Diretoria de Políticas e Ações Inclusivas (DAIN)', campus: 'Mossoró', email: 'dain@uern.br', predioNome: 'Campus Central' },
  { codigo: '037', sigla: 'DSIB', nome: 'Diretoria do Sistema Integrado de Bibliotecas (DSIB)', campus: 'Mossoró', email: 'biblioteca@uern.br', predioNome: 'Biblioteca Central - Campus Central' },
  { codigo: '038', sigla: 'EDUERN', nome: 'Edições UERN (EDUERN)', campus: 'Mossoró', email: 'edicoes.uern@uern.br', predioNome: 'Campus Central' },
  { codigo: '001', sigla: 'GABINETE DA REITORIA', nome: 'Gabinete da Reitoria', campus: 'Mossoró', email: 'chgab@uern.br', predioNome: 'Edifício Epílogo de Campos (Reitoria)' },
  { codigo: '039', sigla: 'OUVIDORIA', nome: 'Ouvidoria Geral da UERN', campus: 'Mossoró', email: 'ouvidoria@uern.br', predioNome: 'Edifício Epílogo de Campos' },
  { codigo: '040', sigla: 'AGT', nome: 'Assessoria de Governança e Transparência (AGT)', campus: 'Mossoró', email: 'governanca@uern.br', predioNome: 'Edifício Epílogo de Campos' },
  { codigo: '041', sigla: 'AJUR', nome: 'Assessoria Jurídica (AJUR)', campus: 'Mossoró', email: 'ajur@uern.br', predioNome: 'Edifício Epílogo de Campos' },
  { codigo: '042', sigla: 'AAI', nome: 'Assessoria de Avaliação Institucional (AAI)', campus: 'Mossoró', email: 'aai@uern.br', predioNome: 'Campus Central' },
  { codigo: '043', sigla: 'AAN', nome: 'Assessoria de Assuntos Normativos (AAN)', campus: 'Mossoró', email: 'aan@uern.br', predioNome: 'Edifício Epílogo de Campos' },

  // 6. Comitês Especializados
  { codigo: '050', sigla: 'CESL', nome: 'Comitê Especializado - Saúde e Laboratórios', campus: 'Mossoró', email: 'cesl@uern.br', predioNome: 'Campus Central' },
  { codigo: '051', sigla: 'CEEICV', nome: 'Comitê Especializado - Eventos e Com. Visual', campus: 'Mossoró', email: 'ceeicv@uern.br', predioNome: 'Campus Central' },
  { codigo: '052', sigla: 'CEEL', nome: 'Comitê Especializado - Esportes e Lazer', campus: 'Mossoró', email: 'ceel@uern.br', predioNome: 'Campus Central' },
  { codigo: '053', sigla: 'CEFAV', nome: 'Comitê Especializado - Fotografia, Audio e Vídeo', campus: 'Mossoró', email: 'cefav@uern.br', predioNome: 'Campus Central' },
];

async function runSeedPortalTreinamento() {
  console.log('--- VERIFICAÇÃO E INTEGRIDADE DO PORTAL CENTRAL PROAD UERN (47 UNIDADES) ---');

  for (const u of UNIDADES_47) {
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

  console.log('Catálogo de 47 unidades oficiais verificado com sucesso.');
}

module.exports = { runSeedPortalTreinamento };

if (require.main === module) {
  runSeedPortalTreinamento()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
