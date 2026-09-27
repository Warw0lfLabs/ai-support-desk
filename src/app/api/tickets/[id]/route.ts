import { getTicket, updateTicket } from '@/server/services/ticket-service';
import { handle } from '@/server/http/responses';
import { readJson } from '@/server/http/request';
import { protectMutation } from '@/server/http/protection';
type Context = { params: Promise<{ id: string }> };
export function GET(_request: Request, context: Context) {
  return handle('tickets.get', async () =>
    getTicket((await context.params).id),
  );
}
export function PATCH(request: Request, context: Context) {
  return handle('tickets.update', async () => {
    protectMutation(request, 'ticket');
    return updateTicket((await context.params).id, await readJson(request));
  });
}
