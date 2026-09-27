import { getDb } from '@/server/db/prisma';
import { handle } from '@/server/http/responses';
import { AppError } from '@/server/http/errors';
export const dynamic = 'force-dynamic';
export function GET() {
  return handle('health', async () => {
    try {
      await getDb().$queryRaw`SELECT 1`;
    } catch {
      throw new AppError(
        'DATABASE_UNAVAILABLE',
        503,
        'The service is not ready.',
      );
    }
    return { status: 'ok', database: 'reachable' };
  });
}
