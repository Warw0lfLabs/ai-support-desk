import 'server-only';
import { getDb } from '../db/prisma';
import { databaseError } from '../db/errors';
import { assertDemoScope, type AccessContext } from '../access/access-context';
import { AppError, notFound } from '../http/errors';
import type { AppendMessageInput } from '@/features/tickets/schemas';
import type { MessageRole } from '@/features/tickets/contracts';
export const messageRepository = {
  async append(
    context: AccessContext,
    ticketId: string,
    role: MessageRole,
    input: AppendMessageInput,
  ) {
    assertDemoScope(context);
    return getDb()
      .$transaction(async (tx) => {
        // Serialize appends per ticket, including simultaneous retries of one submission.
        const rows = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "Ticket" WHERE id = ${ticketId}::uuid FOR UPDATE`;
        if (!rows.length) throw notFound();
        const existing = await tx.ticketMessage.findUnique({
          where: {
            ticketId_clientMessageId: {
              ticketId,
              clientMessageId: input.clientMessageId,
            },
          },
        });
        if (existing) {
          if (existing.authorRole !== role || existing.body !== input.body)
            throw new AppError(
              'IDEMPOTENCY_CONFLICT',
              409,
              'This submission identifier was already used for a different reply.',
            );
          return existing;
        }
        const changed = await tx.ticket.updateMany({
          where: {
            id: ticketId,
            conversationVersion: input.expectedConversationVersion,
          },
          data: { conversationVersion: { increment: 1 } },
        });
        if (!changed.count) {
          if (
            !(await tx.ticket.findUnique({
              where: { id: ticketId },
              select: { id: true },
            }))
          )
            throw notFound();
          throw new AppError(
            'CONVERSATION_CONFLICT',
            409,
            'New conversation activity was detected. Your draft is preserved. Review the latest messages before sending again.',
          );
        }
        return tx.ticketMessage.create({
          data: {
            ticketId,
            clientMessageId: input.clientMessageId,
            sequence: input.expectedConversationVersion + 1,
            authorRole: role,
            body: input.body,
          },
        });
      })
      .catch(databaseError);
  },
  async page(context: AccessContext, ticketId: string, before: number) {
    assertDemoScope(context);
    return getDb()
      .$transaction(
        async (tx) => {
          const ticket = await tx.ticket.findUnique({
            where: { id: ticketId },
            select: { conversationVersion: true },
          });
          if (!ticket) throw notFound();
          const messages = await tx.ticketMessage.findMany({
            where: { ticketId, sequence: { lt: before } },
            orderBy: { sequence: 'desc' },
            take: 51,
          });
          return { messages, conversationVersion: ticket.conversationVersion };
        },
        { isolationLevel: 'RepeatableRead' },
      )
      .catch(databaseError);
  },
  async snapshot(context: AccessContext, ticketId: string) {
    assertDemoScope(context);
    return getDb()
      .$transaction(
        async (tx) => {
          const ticket = await tx.ticket.findUnique({
            where: { id: ticketId },
            select: { title: true, conversationVersion: true },
          });
          if (!ticket) throw notFound();
          const messages = await tx.ticketMessage.findMany({
            where: { ticketId, sequence: { gt: 1 } },
            orderBy: { sequence: 'desc' },
            take: 20,
            select: { sequence: true, authorRole: true, body: true },
          });
          const first = await tx.ticketMessage.findUnique({
            where: { ticketId_sequence: { ticketId, sequence: 1 } },
            select: { sequence: true, authorRole: true, body: true },
          });
          if (!first) throw new Error('Missing opening message.');
          return { ...ticket, messages: [first, ...messages.reverse()] };
        },
        { isolationLevel: 'RepeatableRead' },
      )
      .catch(databaseError);
  },
};
