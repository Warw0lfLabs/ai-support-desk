import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../src/server/config/env', () => ({
  getEnv: () => ({ APP_ORIGIN: 'http://localhost:3000' }),
}));
const log = vi.hoisted(() => vi.fn());
vi.mock('../../src/server/logging/logger', () => ({ logEvent: log }));
import { handle } from '../../src/server/http/responses';
afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  log.mockClear();
});
it('limits analysis globally without trusting forwarded IP headers', async () => {
  const { protectMutation } = await import('../../src/server/http/protection');
  for (let i = 0; i < 20; i++)
    protectMutation(
      new Request('http://localhost', {
        headers: { 'x-forwarded-for': `192.0.2.${i}` },
      }),
      'analysis',
    );
  expect(() =>
    protectMutation(new Request('http://localhost'), 'analysis'),
  ).toThrow('Too many requests');
});
it('resets a request budget after its time window', async () => {
  vi.useFakeTimers();
  const { protectMutation } = await import('../../src/server/http/protection');
  for (let i = 0; i < 20; i++)
    protectMutation(new Request('http://localhost'), 'analysis');
  vi.advanceTimersByTime(60001);
  expect(() =>
    protectMutation(new Request('http://localhost'), 'analysis'),
  ).not.toThrow();
});
it('rejects cross-site browser writes even without an Origin header', async () => {
  const { protectMutation } = await import('../../src/server/http/protection');
  expect(() =>
    protectMutation(
      new Request('http://localhost', {
        headers: { 'sec-fetch-site': 'cross-site' },
      }),
      'ticket',
    ),
  ).toThrow('This origin cannot modify tickets');
});
it('never exposes or logs raw exceptions', async () => {
  const response = await handle('tickets.test', async () => {
    throw new Error('SECRET_DATABASE_PASSWORD');
  });
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain('SECRET_DATABASE_PASSWORD');
  expect(JSON.stringify(log.mock.calls)).not.toContain(
    'SECRET_DATABASE_PASSWORD',
  );
  expect(response.headers.get('cache-control')).toBe('no-store');
});
