import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ append: vi.fn(), enabled: false }));
vi.mock('../../src/server/repositories/message-repository', () => ({
  messageRepository: { append: mocks.append },
}));
vi.mock('../../src/server/config/env', () => ({
  getEnv: () => ({ DEMO_CUSTOMER_REPLIES: mocks.enabled }),
}));
import {
  appendDemoCustomerMessage,
  appendSupportMessage,
} from '../../src/server/services/message-service';
const id = '00000000-0000-4000-8000-000000000001';
beforeEach(() => {
  mocks.enabled = false;
  mocks.append.mockReset().mockResolvedValue({
    id,
    sequence: 2,
    authorRole: 'SUPPORT',
    body: 'Reply',
    createdAt: new Date('2026-09-26'),
  });
});
it('rejects demo replies at the service boundary when disabled', async () => {
  await expect(
    appendDemoCustomerMessage(id, {
      body: 'Reply',
      clientMessageId: '10000000-0000-4000-8000-000000000001',
      expectedConversationVersion: 1,
    }),
  ).rejects.toMatchObject({ status: 404 });
  expect(mocks.append).not.toHaveBeenCalled();
});
it('assigns support role independently of the demo flag', async () => {
  await appendSupportMessage(id, {
    body: 'Reply',
    clientMessageId: '10000000-0000-4000-8000-000000000001',
    expectedConversationVersion: 1,
  });
  expect(mocks.append).toHaveBeenCalledWith(
    { kind: 'synthetic-demo' },
    id,
    'SUPPORT',
    {
      body: 'Reply',
      clientMessageId: '10000000-0000-4000-8000-000000000001',
      expectedConversationVersion: 1,
    },
  );
});
it('assigns customer role only through the enabled demo operation', async () => {
  mocks.enabled = true;
  await appendDemoCustomerMessage(id, {
    body: 'Reply',
    clientMessageId: '10000000-0000-4000-8000-000000000001',
    expectedConversationVersion: 1,
  });
  expect(mocks.append).toHaveBeenCalledWith(
    { kind: 'synthetic-demo' },
    id,
    'CUSTOMER',
    {
      body: 'Reply',
      clientMessageId: '10000000-0000-4000-8000-000000000001',
      expectedConversationVersion: 1,
    },
  );
});
