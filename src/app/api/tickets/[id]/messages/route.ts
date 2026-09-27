import { handle } from '@/server/http/responses';
import { protectMutation } from '@/server/http/protection';
import { readJson, parseQuery } from '@/server/http/request';
import { messageQuerySchema } from '@/features/tickets/schemas';
import {
  appendSupportMessage,
  listMessages,
} from '@/server/services/message-service';
type Context = { params: Promise<{ id: string }> };
export function GET(request: Request, context: Context) {
  return handle('messages.list', async () =>
    listMessages(
      (await context.params).id,
      parseQuery(new URL(request.url).searchParams, messageQuerySchema),
    ),
  );
}
export function POST(request: Request, context: Context) {
  return handle(
    'messages.support',
    async () => {
      protectMutation(request, 'ticket');
      return appendSupportMessage(
        (await context.params).id,
        await readJson(request),
      );
    },
    201,
  );
}
