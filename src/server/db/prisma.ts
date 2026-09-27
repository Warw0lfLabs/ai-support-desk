import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { getEnv } from '../config/env';
const globalDb = globalThis as unknown as { supportDb?: PrismaClient };
export function getDb(): PrismaClient {
  return (globalDb.supportDb ??= new PrismaClient({
    adapter: new PrismaPg({
      connectionString: getEnv().DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 5000,
    }),
  }));
}
