import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  start: vi.fn(),
  succeed: vi.fn(),
  fail: vi.fn(),
  analyze: vi.fn(),
  snapshot: vi.fn(),
}));
vi.mock('../../src/server/repositories/message-repository', () => ({
  messageRepository: { snapshot: mocks.snapshot },
}));
vi.mock('../../src/server/services/ticket-service', () => ({
  getTicket: mocks.get,
}));
vi.mock('../../src/server/repositories/analysis-repository', () => ({
  analysisRepository: {
    start: mocks.start,
    succeed: mocks.succeed,
    fail: mocks.fail,
  },
}));
vi.mock('../../src/server/ai/provider-factory', () => ({
  getAIProvider: () => ({ name: 'mock', model: 'v1', analyze: mocks.analyze }),
}));
vi.mock('../../src/server/config/env', () => ({
  getEnv: () => ({ AI_TIMEOUT_MS: 1000 }),
}));
import { analyzeTicket } from '../../src/server/services/analysis-service';
const result = {
  summary: 'Summary',
  category: 'OTHER',
  priority: 'MEDIUM',
  suggestedResponse: 'Response',
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockResolvedValue({
    title: 'Title',
    conversationVersion: 1,
    analysis: { state: 'NOT_STARTED' },
  });
  mocks.snapshot.mockResolvedValue({
    title: 'Title',
    conversationVersion: 1,
    messages: [{ authorRole: 'CUSTOMER', body: 'Description' }],
  });
  mocks.analyze.mockResolvedValue(result);
});
it('persists a successful result', async () => {
  await analyzeTicket('success');
  expect(mocks.succeed).toHaveBeenCalledWith(
    { kind: 'synthetic-demo' },
    'success',
    result,
    'mock',
    'v1',
    1,
    0,
  );
});
it('reuses successful analysis', async () => {
  mocks.get.mockResolvedValue({ analysis: { state: 'SUCCEEDED' } });
  await analyzeTicket('cached');
  expect(mocks.analyze).not.toHaveBeenCalled();
});
it('persists a safe failure and permits a later retry', async () => {
  mocks.analyze.mockRejectedValueOnce(new Error('SECRET'));
  await expect(analyzeTicket('failure')).rejects.toMatchObject({
    code: 'AI_FAILED',
  });
  expect(mocks.fail).toHaveBeenCalledWith(
    { kind: 'synthetic-demo' },
    'failure',
    'AI_FAILED',
  );
  await expect(analyzeTicket('failure')).resolves.toBeDefined();
});
it('rejects concurrent execution in one process', async () => {
  let finish!: (value: typeof result) => void;
  mocks.analyze.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = analyzeTicket('concurrent');
  await vi.waitFor(() => expect(mocks.analyze).toHaveBeenCalled());
  await expect(analyzeTicket('concurrent')).rejects.toMatchObject({
    status: 409,
  });
  finish(result);
  await first;
});
it('allows retrying a persisted processing state after interruption', async () => {
  mocks.get.mockResolvedValue({
    title: 'Title',
    conversationVersion: 1,
    analysis: { state: 'PROCESSING' },
  });
  await analyzeTicket('interrupted');
  expect(mocks.analyze).toHaveBeenCalledOnce();
});

it('refreshes successful but stale analysis', async () => {
  mocks.get.mockResolvedValue({
    analysis: { state: 'SUCCEEDED', isStale: true },
  });
  await analyzeTicket('stale');
  expect(mocks.analyze).toHaveBeenCalledOnce();
});
it('records the analyzed snapshot revision even if a new message arrives', async () => {
  mocks.snapshot.mockResolvedValue({
    title: 'Title',
    conversationVersion: 2,
    messages: [
      { authorRole: 'CUSTOMER', body: 'Opening' },
      { authorRole: 'CUSTOMER', body: 'New detail' },
    ],
  });
  mocks.get
    .mockResolvedValueOnce({ analysis: { state: 'NOT_STARTED' } })
    .mockResolvedValue({
      conversationVersion: 3,
      analysis: { state: 'SUCCEEDED', isStale: true },
    });
  const ticket = await analyzeTicket('race');
  expect(mocks.succeed).toHaveBeenCalledWith(
    { kind: 'synthetic-demo' },
    'race',
    result,
    'mock',
    'v1',
    2,
    0,
  );
  expect(ticket.analysis.isStale).toBe(true);
});
