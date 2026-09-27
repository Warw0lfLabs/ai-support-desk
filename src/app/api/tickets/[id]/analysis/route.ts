import { z } from 'zod';
import { analyzeTicket } from '@/server/services/analysis-service';
import { handle } from '@/server/http/responses';
import { protectMutation } from '@/server/http/protection';
import { readJson } from '@/server/http/request';
export const maxDuration = 30;
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle('tickets.analyze', async () => {
    protectMutation(request, 'analysis');
    z.strictObject({}).parse(await readJson(request));
    return analyzeTicket((await context.params).id);
  });
}
