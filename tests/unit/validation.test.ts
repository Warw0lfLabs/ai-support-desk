import { describe, expect, it } from 'vitest';
import {
  createTicketSchema,
  listTicketsSchema,
  updateTicketSchema,
} from '../../src/features/tickets/schemas';
import { analysisSchema } from '../../src/features/analysis/schemas';
import { canTransition } from '../../src/features/tickets/status-rules';
describe('ticket contracts', () => {
  it('trims content', () =>
    expect(
      createTicketSchema.parse({ title: '  Test  ', description: ' Detail ' })
        .title,
    ).toBe('Test'));
  it.each([
    { title: ' ', description: 'detail' },
    { title: 'x'.repeat(161), description: 'detail' },
    { title: 'ok', description: 'x'.repeat(10001) },
    { title: 'ok', description: 'detail', status: 'RESOLVED' },
  ])('rejects invalid or extra writable fields %j', (input) =>
    expect(createTicketSchema.safeParse(input).success).toBe(false),
  );
  it('rejects mass assignment on status updates', () =>
    expect(
      updateTicketSchema.safeParse({
        status: 'OPEN',
        version: 1,
        description: 'overwritten',
      }).success,
    ).toBe(false));
  it('defaults pagination', () =>
    expect(listTicketsSchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
    }));
  it.each(['0', '-1', '1.2', '1e2', '10001'])(
    'rejects invalid page %s',
    (page) => expect(listTicketsSchema.safeParse({ page }).success).toBe(false),
  );
  it('rejects excessive page sizes', () =>
    expect(listTicketsSchema.safeParse({ pageSize: '101' }).success).toBe(
      false,
    ));
  it('requires completed analysis fields', () =>
    expect(
      analysisSchema.safeParse({
        summary: 'ok',
        category: 'OTHER',
        priority: 'MEDIUM',
      }).success,
    ).toBe(false));
  it('permits reopening but not resolved to in progress', () => {
    expect(canTransition('RESOLVED', 'OPEN')).toBe(true);
    expect(canTransition('RESOLVED', 'IN_PROGRESS')).toBe(false);
    expect(canTransition('OPEN', 'OPEN')).toBe(true);
  });
});
