import 'server-only';
import type {
  Ticket,
  TicketAnalysis,
  TicketMessage,
} from '@/generated/prisma/client';
import type { TicketDTO, TicketListDTO } from '@/features/tickets/contracts';
import {
  createTicketSchema,
  idSchema,
  listTicketsSchema,
  updateTicketSchema,
} from '@/features/tickets/schemas';
import { canTransition } from '@/features/tickets/status-rules';
import { ticketRepository } from '../repositories/ticket-repository';
import { AppError, notFound } from '../http/errors';
import { toMessageDTO } from './message-service';
import { getAccessContext } from '../access/access-context';
function toDTO(
  ticket: Ticket & {
    analysis: TicketAnalysis | null;
    messages: TicketMessage[];
  },
): TicketDTO {
  const a = ticket.analysis;
  if (!a) throw new Error('Missing analysis record.');
  return {
    id: ticket.id,
    title: ticket.title,
    conversationVersion: ticket.conversationVersion,
    messages: ticket.messages.slice(0, 50).reverse().map(toMessageDTO),
    nextBeforeSequence:
      ticket.messages.length > 50 ? ticket.messages[49]!.sequence : null,
    status: ticket.status,
    version: ticket.version,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    analysis: {
      state: a.state,
      summary: a.summary,
      category: a.category,
      priority: a.priority,
      suggestedResponse: a.suggestedResponse,
      provider: a.provider,
      analyzedConversationVersion: a.analyzedConversationVersion,
      omittedMessageCount: a.omittedMessageCount,
      isStale:
        a.summary !== null &&
        a.analyzedConversationVersion !== ticket.conversationVersion,
      lastErrorCode: a.lastErrorCode,
      updatedAt: a.updatedAt.toISOString(),
    },
  };
}
export async function createTicket(input: unknown) {
  return toDTO(
    await ticketRepository.create(
      getAccessContext(),
      createTicketSchema.parse(input),
    ),
  );
}
export async function getTicket(id: string) {
  if (!idSchema.safeParse(id).success) throw notFound();
  const ticket = await ticketRepository.find(getAccessContext(), id);
  if (!ticket) throw notFound();
  return toDTO(ticket);
}
export async function listTickets(input: unknown): Promise<TicketListDTO> {
  const query = listTicketsSchema.parse(input);
  const result = await ticketRepository.list(getAccessContext(), query);
  return {
    ...result,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(result.totalItems / query.pageSize),
    items: result.items.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      version: t.version,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      analysis: {
        state: t.analysis?.state ?? 'NOT_STARTED',
        category: t.analysis?.category ?? null,
        priority: t.analysis?.priority ?? null,
        isStale:
          t.analysis?.category != null &&
          t.analysis.analyzedConversationVersion !== t.conversationVersion,
      },
    })),
  };
}
export async function updateTicket(id: string, input: unknown) {
  const data = updateTicketSchema.parse(input);
  const current = await getTicket(id);
  if (!canTransition(current.status, data.status))
    throw new AppError(
      'INVALID_TRANSITION',
      409,
      'Reopen this ticket before moving it into progress.',
    );
  const result = await ticketRepository.updateStatus(
    getAccessContext(),
    id,
    data.version,
    data.status,
  );
  if (!result.count)
    throw new AppError(
      'VERSION_CONFLICT',
      409,
      'This ticket changed. Refresh and try again.',
    );
  return getTicket(id);
}
