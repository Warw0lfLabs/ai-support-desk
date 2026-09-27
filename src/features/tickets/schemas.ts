import { z } from 'zod';
export const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;
export const categories = [
  'BILLING',
  'TECHNICAL',
  'ACCOUNT',
  'FEATURE_REQUEST',
  'OTHER',
] as const;
export const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const idSchema = z.uuid();
export const createTicketSchema = z.strictObject({
  title: z.string().trim().min(1, 'Enter a title.').max(160),
  description: z.string().trim().min(1, 'Describe the issue.').max(10000),
});
export const updateTicketSchema = z.strictObject({
  status: z.enum(statuses),
  version: z.number().int().positive().max(2147483646),
});
const integer = (fallback: number, max: number) =>
  z.preprocess(
    (value) =>
      value === undefined
        ? fallback
        : typeof value === 'string' && /^\d+$/.test(value)
          ? Number(value)
          : value,
    z.number().int().min(1).max(max),
  );
export const listTicketsSchema = z.strictObject({
  page: integer(1, 10000),
  pageSize: integer(20, 100),
  q: z.string().trim().max(200).optional(),
  status: z.enum(statuses).optional(),
  category: z.enum(categories).optional(),
  priority: z.enum(priorities).optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type ListTicketsInput = z.infer<typeof listTicketsSchema>;

export const appendMessageSchema = z.strictObject({
  clientMessageId: z.uuid(),
  body: z.string().trim().min(1, 'Write a reply.').max(10000),
  expectedConversationVersion: z.number().int().positive().max(2147483646),
});
export const messageQuerySchema = z.strictObject({
  before: integer(2147483647, 2147483647),
});
export type AppendMessageInput = z.infer<typeof appendMessageSchema>;
