import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import type {
  CreateTicketInput,
  ListTicketsInput,
} from '@/features/tickets/schemas';
import type { TicketStatus } from '@/features/tickets/contracts';
import { getDb } from '../db/prisma';
import { databaseError } from '../db/errors';
import { assertDemoScope, type AccessContext } from '../access/access-context';
const summarySelect = {
  id: true,
  title: true,
  status: true,
  version: true,
  conversationVersion: true,
  createdAt: true,
  updatedAt: true,
  analysis: {
    select: {
      state: true,
      category: true,
      priority: true,
      analyzedConversationVersion: true,
    },
  },
} satisfies Prisma.TicketSelect;
export const ticketRepository = {
  async create(context: AccessContext, input: CreateTicketInput) {
    assertDemoScope(context);
    return getDb()
      .ticket.create({
        data: {
          title: input.title,
          messages: {
            create: {
              sequence: 1,
              authorRole: 'CUSTOMER',
              body: input.description,
            },
          },
          analysis: { create: {} },
        },
        include: {
          analysis: true,
          messages: { orderBy: { sequence: 'desc' }, take: 51 },
        },
      })
      .catch(databaseError);
  },
  async find(context: AccessContext, id: string) {
    assertDemoScope(context);
    return getDb()
      .$transaction(
        (tx) =>
          tx.ticket.findUnique({
            where: { id },
            include: {
              analysis: true,
              messages: { orderBy: { sequence: 'desc' }, take: 51 },
            },
          }),
        { isolationLevel: 'RepeatableRead' },
      )
      .catch(databaseError);
  },
  async list(context: AccessContext, input: ListTicketsInput) {
    assertDemoScope(context);
    const literal = input.q?.replace(/[\\%_]/g, '\\$&');
    const where: Prisma.TicketWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(literal
        ? {
            OR: [
              { title: { contains: literal, mode: 'insensitive' } },
              {
                messages: {
                  some: { body: { contains: literal, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
      ...(input.category || input.priority
        ? {
            analysis: {
              is: {
                analyzedConversationVersion: { not: null },
                ...(input.category ? { category: input.category } : {}),
                ...(input.priority ? { priority: input.priority } : {}),
              },
            },
          }
        : {}),
    };
    const groupQuery = getDb().ticket.groupBy({
      by: ['status'],
      orderBy: { status: 'asc' },
      _count: { _all: true },
    });
    const [items, totalItems, groups] = await getDb()
      .$transaction(
        [
          getDb().ticket.findMany({
            where,
            select: summarySelect,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: (input.page - 1) * input.pageSize,
            take: input.pageSize,
          }),
          getDb().ticket.count({ where }),
          groupQuery,
        ],
        { isolationLevel: 'RepeatableRead' },
      )
      .catch(databaseError);
    const count = (status: TicketStatus) =>
      groups.find((g) => g.status === status)?._count._all ?? 0;
    return {
      items,
      totalItems,
      stats: {
        total: groups.reduce((sum, g) => sum + g._count._all, 0),
        open: count('OPEN'),
        inProgress: count('IN_PROGRESS'),
        resolved: count('RESOLVED'),
      },
    };
  },
  async updateStatus(
    context: AccessContext,
    id: string,
    version: number,
    status: TicketStatus,
  ) {
    assertDemoScope(context);
    return getDb()
      .ticket.updateMany({
        where: { id, version },
        data: { status, version: { increment: 1 } },
      })
      .catch(databaseError);
  },
};
