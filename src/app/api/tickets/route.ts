import { createTicket, listTickets } from '@/server/services/ticket-service';
import { listTicketsSchema } from '@/features/tickets/schemas';
import { handle } from '@/server/http/responses';
import { parseQuery, readJson } from '@/server/http/request';
import { protectMutation } from '@/server/http/protection';
export const runtime = 'nodejs';
export function GET(request: Request) {
  return handle('tickets.list', () =>
    listTickets(
      parseQuery(new URL(request.url).searchParams, listTicketsSchema),
    ),
  );
}
export function POST(request: Request) {
  return handle(
    'tickets.create',
    async () => {
      protectMutation(request, 'ticket');
      return createTicket(await readJson(request));
    },
    201,
  );
}
