import { handle } from '@/server/http/responses';
import { protectMutation } from '@/server/http/protection';
import { readJson } from '@/server/http/request';
import { appendDemoCustomerMessage } from '@/server/services/message-service';
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle(
    'messages.demo-customer',
    async () => {
      protectMutation(request, 'ticket');
      return appendDemoCustomerMessage(
        (await context.params).id,
        await readJson(request),
      );
    },
    201,
  );
}
