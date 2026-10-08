const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed do Portal PROAD-UERN ---');

  // 1. Catálogo Mestre de Unidades da UERN
  const unidades = [
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

  console.log(`Cadastrando ${unidades.length} unidades oficiais da UERN...`);
  const unidadesCriadas = {};
  for (const u of unidades) {
    const criada = await prisma.unidadeCentral.upsert({
      where: { sigla: u.sigla },
      update: { nome: u.nome, campus: u.campus, email: u.email, predioNome: u.predioNome, codigo: u.codigo },
      create: u,
    });
    unidadesCriadas[u.sigla] = criada;
  }

  // 2. Senha padrão criptografada
  const senhaPadrao = await bcrypt.hash('Uern@2026', 10);

  // 3. Usuário Administrador Mestre da PROAD
  console.log('Cadastrando Administrador Geral PROAD...');
  const adminProad = await prisma.usuarioCentral.upsert({
    where: { email: 'adj.proad@uern.br' },
    update: {
      status: 'ATIVO',
      perfilSgc: 'ADMIN_PROAD',
      perfilManut: 'ADMIN',
      perfilPca: 'ADMIN',
      perfilDiarias: 'ADMIN',
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
    },
    create: {
      tipoUsuario: 'SERVIDOR_UERN',
      status: 'ATIVO',
      nome: 'Administrador PROAD',
      email: 'adj.proad@uern.br',
      cpf: '001.002.003-04',
      matricula: '000001-0',
      telefone: '(84) 3315-2100',
      senhaHash: senhaPadrao,
      unidadeId: unidadesCriadas['PROAD'].id,
      perfilSgc: 'ADMIN_PROAD',
      perfilManut: 'ADMIN',
      perfilPca: 'ADMIN',
      perfilDiarias: 'ADMIN',
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

  // 4. Usuário Servidor Ativo com múltiplos perfis (Ex: Engenheiro Fiscal Técnico)
  console.log('Cadastrando Servidor Ativo de Demonstração (Fiscal Técnico)...');
  await prisma.usuarioCentral.upsert({
    where: { email: 'fiscal.tecnico@uern.br' },
    update: {},
    create: {
      tipoUsuario: 'SERVIDOR_UERN',
      status: 'ATIVO',
      nome: 'Eng. Roberto Alves (Fiscal Técnico)',
      email: 'fiscal.tecnico@uern.br',
      cpf: '123.456.789-09',
      matricula: '002345-6',
      telefone: '(84) 99888-1122',
      senhaHash: senhaPadrao,
      unidadeId: unidadesCriadas['SOBE'].id,
      perfilSgc: 'FISCAL_TECNICO',
      perfilManut: 'FISCAL_TECNICO',
      perfilPca: 'UNIDADE',
      permissoesPca: { podeCriarDfd: true, podeEditarDfd: true },
      perfilDiarias: 'DEMANDANTE',
      aprovadoEm: new Date(),
      aprovadoPor: 'adj.proad@uern.br',
    },
  });

  // 5. Servidor Pendente de Aprovação (Pré-Cadastro recente via Google)
  console.log('Cadastrando Servidor Pendente de Homologação...');
  await prisma.usuarioCentral.upsert({
    where: { email: 'mariana.silva@uern.br' },
    update: {},
    create: {
      tipoUsuario: 'SERVIDOR_UERN',
      status: 'PENDENTE_APROVACAO',
      nome: 'Prof. Mariana Silva',
      email: 'mariana.silva@uern.br',
      cpf: '543.210.987-65',
      matricula: '009876-5',
      telefone: '(84) 99123-4567',
      unidadeId: unidadesCriadas['FAFIC'].id,
    },
  });

  // 6. Fornecedor Aprovado (Empresa de Manutenção / Vigilância)
  console.log('Cadastrando Fornecedor Aprovado...');
  await prisma.usuarioCentral.upsert({
    where: { email: 'contato@engenhariafacil.com.br' },
    update: {},
    create: {
      tipoUsuario: 'FORNECEDOR_EXTERNO',
      status: 'ATIVO',
      nome: 'Carlos Eduardo Mendes',
      email: 'contato@engenhariafacil.com.br',
      cpf: '321.654.987-12',
      cnpjEmpresa: '12.345.678/0001-90',
      razaoSocial: 'Engenharia Fácil e Manutenções Ltda',
      nomeFantasia: 'Engenharia Fácil',
      cargoPreposto: 'Diretor de Operações / Preposto',
      telefone: '(84) 3322-9988',
      senhaHash: senhaPadrao,
      perfilSgc: 'FORNECEDOR',
      perfilManut: 'EMPRESA',
      aprovadoEm: new Date(),
      aprovadoPor: 'adj.proad@uern.br',
    },
  });

  // 7. Fornecedor Pendente de Credenciamento
  console.log('Cadastrando Fornecedor Pendente de Credenciamento...');
  await prisma.usuarioCentral.upsert({
    where: { email: 'licitacoes@potiguarservicos.com.br' },
    update: {},
    create: {
      tipoUsuario: 'FORNECEDOR_EXTERNO',
      status: 'PENDENTE_APROVACAO',
      nome: 'Ana Paula Medeiros',
      email: 'licitacoes@potiguarservicos.com.br',
      cpf: '789.456.123-99',
      cnpjEmpresa: '98.765.432/0001-10',
      razaoSocial: 'Potiguar Serviços e Mão de Obra Eireli',
      nomeFantasia: 'Potiguar Serviços',
      cargoPreposto: 'Gerente Administrativa',
      telefone: '(84) 98765-4321',
      senhaHash: senhaPadrao,
    },
  });

  console.log('--- Seed do Portal PROAD-UERN concluído com sucesso! ---');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
