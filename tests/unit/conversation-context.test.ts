import { expect, it } from 'vitest';
import { selectConversationContext } from '../../src/server/ai/conversation-context';
import { appendMessageSchema } from '../../src/features/tickets/schemas';
it('keeps the opening and newest complete messages within the text budget', () => {
  const messages = Array.from({ length: 6 }, (_, i) => ({
    authorRole: 'CUSTOMER' as const,
    body: String(i).repeat(10000),
  }));
  const selected = selectConversationContext('Title', messages, 6);
  expect(selected.messages.map((m) => m.body[0])).toEqual(['0', '4', '5']);
  expect(selected.omittedMessageCount).toBe(3);
  expect(
    selected.messages.reduce((n, m) => n + m.body.length, 0),
  ).toBeLessThanOrEqual(32000);
});
it('limits message count, preserves roles, and strips metadata', () => {
  const messages = Array.from({ length: 30 }, (_, i) => ({
    authorRole: i % 2 ? ('SUPPORT' as const) : ('CUSTOMER' as const),
    body: String(i),
    id: 'private-id',
  }));
  const selected = selectConversationContext('Title', messages, 30);
  expect(selected.messages).toHaveLength(21);
  expect(selected.omittedMessageCount).toBe(9);
  expect(selected.messages[1]?.body).toBe('10');
  expect(selected.messages[0]).not.toHaveProperty('id');
});
it('trims replies and rejects client-controlled roles', () => {
  expect(
    appendMessageSchema.parse({
      body: '  Reply  ',
      clientMessageId: '10000000-0000-4000-8000-000000000001',
      expectedConversationVersion: 1,
    }).body,
  ).toBe('Reply');
  expect(
    appendMessageSchema.safeParse({
      body: 'Reply',
      clientMessageId: '10000000-0000-4000-8000-000000000001',
      expectedConversationVersion: 1,
      authorRole: 'CUSTOMER',
    }).success,
  ).toBe(false);
});
