/**
 * Validador algorítmico oficial de CPF brasileiro.
 * Calcula os dois dígitos verificadores reais e rejeita sequências repetidas.
 */
export function validarCpf(cpf: string): boolean {
  if (!cpf) return false;

  // Remove caracteres não numéricos
  const clean = cpf.replace(/\D/g, '');

  if (clean.length !== 11) return false;

  // Rejeita sequências de dígitos iguais conhecidas (ex: 000.000.000-00, 111.111.111-11...)
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Cálculo do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.charAt(9), 10)) return false;

  // Cálculo do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/**
 * Validador algorítmico oficial de CNPJ brasileiro.
 * Calcula os dois dígitos verificadores reais.
 */
export function validarCnpj(cnpj: string): boolean {
  if (!cnpj) return false;

  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;

  // Rejeita sequências repetidas
  if (/^(\d)\1{13}$/.test(clean)) return false;

  // Primeiro dígito verificador
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(clean.charAt(i), 10) * pesos1[i];
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== parseInt(clean.charAt(12), 10)) return false;

  // Segundo dígito verificador
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(clean.charAt(i), 10) * pesos2[i];
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  if (digito2 !== parseInt(clean.charAt(13), 10)) return false;

  return true;
}

/**
 * Normaliza qualquer formato de matrícula UERN inserido pelo usuário.
 * Se o usuário digitar números corridos como "81558" ou "8155-8",
 * a função identifica o último dígito como DV (8), completa o corpo com zeros à esquerda
 * até 6 dígitos ("008155") e retorna o padrão oficial: "008155-8".
 */
export function normalizarMatriculaUern(val: string): string {
  if (!val) return '';
  const clean = val.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean;

  const dv = clean.slice(-1);
  const corpo = clean.slice(0, -1).slice(0, 6);
  const corpoPadded = corpo.padStart(6, '0');
  return `${corpoPadded}-${dv}`;
}

/**
 * Valida formato da matrícula funcional da UERN.
 * Aceita tanto o formato oficial direto (000000-0) quanto entrada corrida válida.
 */
export function validarMatricula(mat: string): boolean {
  if (!mat) return false;
  const trimmed = mat.trim();
  if (/^\d{6}-\d$/.test(trimmed)) return true;
  const normalizada = normalizarMatriculaUern(trimmed);
  return /^\d{6}-\d$/.test(normalizada);
}

/**
 * Valida se o e-mail pertence estritamente ao domínio institucional @uern.br
 */
export function validarEmailInstitucional(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean.endsWith('@uern.br');
}

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function formatarCpf(val: string): string {
  const clean = val.replace(/\D/g, '').slice(0, 11);
  return clean
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Aplica máscara de CNPJ: 00.000.000/0000-00
 */
export function formatarCnpj(val: string): string {
  const clean = val.replace(/\D/g, '').slice(0, 14);
  return clean
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/**
 * Aplica máscara de matrícula inteligente:
 * Se tiver 7 dígitos completos, formata como xxxxxx-x.
 * Caso contrário, mantém limpo para digitação corrida até blur.
 */
export function formatarMatricula(val: string): string {
  const clean = val.replace(/\D/g, '').slice(0, 7);
  if (clean.length === 7) {
    return `${clean.slice(0, 6)}-${clean.slice(6, 7)}`;
  }
  return clean;
}
