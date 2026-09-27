import 'server-only';
import type { TicketMessage } from '@/generated/prisma/client';
import type { MessageDTO, MessagePageDTO } from '@/features/tickets/contracts';
import {
  appendMessageSchema,
  idSchema,
  messageQuerySchema,
} from '@/features/tickets/schemas';
import { messageRepository } from '../repositories/message-repository';
import { getAccessContext } from '../access/access-context';
import { getEnv } from '../config/env';
import { notFound } from '../http/errors';
export function toMessageDTO(message: TicketMessage): MessageDTO {
  return {
    id: message.id,
    sequence: message.sequence,
    authorRole: message.authorRole,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}
export async function listMessages(
  id: string,
  query: unknown,
): Promise<MessagePageDTO> {
  if (!idSchema.safeParse(id).success) throw notFound();
  const { before } = messageQuerySchema.parse(query);
  const page = await messageRepository.page(getAccessContext(), id, before);
  return {
    items: page.messages.slice(0, 50).reverse().map(toMessageDTO),
    nextBeforeSequence:
      page.messages.length > 50 ? page.messages[49]!.sequence : null,
    conversationVersion: page.conversationVersion,
  };
}
export async function appendSupportMessage(id: string, input: unknown) {
  if (!idSchema.safeParse(id).success) throw notFound();
  return toMessageDTO(
    await messageRepository.append(
      getAccessContext(),
      id,
      'SUPPORT',
      appendMessageSchema.parse(input),
    ),
  );
}
export async function appendDemoCustomerMessage(id: string, input: unknown) {
  if (!getEnv().DEMO_CUSTOMER_REPLIES) throw notFound();
  if (!idSchema.safeParse(id).success) throw notFound();
  return toMessageDTO(
    await messageRepository.append(
      getAccessContext(),
      id,
      'CUSTOMER',
      appendMessageSchema.parse(input),
    ),
  );
}
