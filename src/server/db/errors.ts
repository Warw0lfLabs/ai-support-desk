import 'server-only';
import { AppError } from '../http/errors';
// Drop the original exception (including its cause) at the persistence boundary.
// Server Components otherwise let Next.js log raw Prisma errors.
export function databaseError(error?: unknown): never {
  if (error instanceof AppError) throw error;
  throw new AppError(
    'DATABASE_UNAVAILABLE',
    503,
    'The data service is temporarily unavailable. Please try again.',
  );
}
