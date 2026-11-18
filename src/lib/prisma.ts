import { PrismaClient } from '@prisma/client';
import {
  encryptFieldsInData,
  encryptWhereUnique,
  decryptFieldsInResult,
} from './crypto-pii';

function otimizarDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes('neon.tech') && !url.hostname.includes('-pooler')) {
      url.hostname = url.hostname.replace(/^([^.]+)/, '$1-pooler');
    }
    if (url.hostname.includes('-pooler')) {
      if (!url.searchParams.has('pgbouncer')) url.searchParams.set('pgbouncer', 'true');
      if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '5');
      if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '20');
      if (!url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout', '15');
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const PII_DETERMINISTIC = ['cpf'];
const PII_RANDOM = ['telefone', 'matricula', 'cnpjEmpresa'];
const PII_ALL = [...PII_DETERMINISTIC, ...PII_RANDOM];

function createPrismaClient() {
  const pooledUrl = otimizarDatabaseUrl(process.env.DATABASE_URL);
  const baseClient = new PrismaClient({
    ...(pooledUrl ? { datasources: { db: { url: pooledUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  return baseClient.$extends({
    query: {
      usuarioCentral: {
        async findUnique({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, PII_DETERMINISTIC);
          const result = await query(args);
          return decryptFieldsInResult(result, PII_ALL);
        },
        async findUniqueOrThrow({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, PII_DETERMINISTIC);
          const result = await query(args);
          return decryptFieldsInResult(result, PII_ALL);
        },
        async findFirst({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, PII_DETERMINISTIC);
          const result = await query(args);
          return decryptFieldsInResult(result, PII_ALL);
        },
        async findFirstOrThrow({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, PII_DETERMINISTIC);
          const result = await query(args);
          return decryptFieldsInResult(result, PII_ALL);
        },
        async findMany({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, PII_DETERMINISTIC);
          const result = await query(args);
          return decryptFieldsInResult(result, PII_ALL);
        },
        async create({ args, query }) {
          args.data = encryptFieldsInData(args.data, PII_DETERMINISTIC, PII_RANDOM);
          const result = await query(args);
          return decryptFieldsInResult(result, PII_ALL);
        },
        async update({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, PII_DETERMINISTIC);
          args.data = encryptFieldsInData(args.data, PII_DETERMINISTIC, PII_RANDOM);
          const result = await query(args);
          return decryptFieldsInResult(result, PII_ALL);
        },
        async upsert({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, PII_DETERMINISTIC);
          args.create = encryptFieldsInData(args.create, PII_DETERMINISTIC, PII_RANDOM);
          args.update = encryptFieldsInData(args.update, PII_DETERMINISTIC, PII_RANDOM);
          const result = await query(args);
          return decryptFieldsInResult(result, PII_ALL);
        },
        async updateMany({ args, query }) {
          if (args.where) args.where = encryptWhereUnique(args.where, PII_DETERMINISTIC);
          args.data = encryptFieldsInData(args.data, PII_DETERMINISTIC, PII_RANDOM);
          return query(args);
        },
      },
    },
  });
}

export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

declare global {
  var prismaGlobal: ExtendedPrismaClient | undefined;
}

export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

globalThis.prismaGlobal = prisma;

export default prisma;
