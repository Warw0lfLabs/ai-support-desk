import { expect, it, vi } from 'vitest';
import { OpenAICompatibleProvider } from '../../src/server/ai/openai-compatible-provider';
const result = {
  summary: 'A billing issue.',
  category: 'BILLING',
  priority: 'MEDIUM',
  suggestedResponse: 'Please share the invoice reference.',
};
const response = (content: string, finish_reason = 'stop') =>
  Response.json({ choices: [{ finish_reason, message: { content } }] });
it('sends only the necessary ticket data and parses output', async () => {
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValue(response(JSON.stringify(result)));
  const provider = new OpenAICompatibleProvider(
    'test-model',
    'https://example.com/v1',
    'test-key',
    transport,
  );
  expect(
    await provider.analyze(
      {
        title: 'Billing',
        messages: [{ authorRole: 'CUSTOMER', body: 'Synthetic' }],
        omittedMessageCount: 0,
      },
      new AbortController().signal,
    ),
  ).toEqual(result);
  const [, request] = transport.mock.calls[0]!;
  const body = JSON.parse(request!.body as string);
  expect(JSON.parse(body.messages[1].content)).toEqual({
    title: 'Billing',
    messages: [{ authorRole: 'CUSTOMER', body: 'Synthetic' }],
    omittedMessageCount: 0,
  });
  expect(body).not.toHaveProperty('ticketId');
  expect(request!.redirect).toBe('error');
});
it.each([
  ['not json', 'stop'],
  [JSON.stringify({ ...result, priority: 'MADE_UP' }), 'stop'],
  [JSON.stringify(result), 'length'],
])('rejects unusable output %s', async (content, finish) => {
  const provider = new OpenAICompatibleProvider(
    'model',
    'https://example.com',
    'key',
    vi.fn<typeof fetch>().mockResolvedValue(response(content, finish)),
  );
  await expect(
    provider.analyze(
      {
        title: 'x',
        messages: [{ authorRole: 'CUSTOMER', body: 'y' }],
        omittedMessageCount: 0,
      },
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE', status: 502 });
});
it('handles refusals', async () => {
  const provider = new OpenAICompatibleProvider(
    'model',
    'https://example.com',
    'key',
    vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        choices: [
          {
            finish_reason: 'stop',
            message: { content: null, refusal: 'Refused' },
          },
        ],
      }),
    ),
  );
  await expect(
    provider.analyze(
      {
        title: 'x',
        messages: [{ authorRole: 'CUSTOMER', body: 'y' }],
        omittedMessageCount: 0,
      },
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' });
});
it('sanitizes upstream failures', async () => {
  const provider = new OpenAICompatibleProvider(
    'model',
    'https://example.com',
    'key',
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('SECRET upstream', { status: 500 })),
  );
  await expect(
    provider.analyze(
      {
        title: 'x',
        messages: [{ authorRole: 'CUSTOMER', body: 'y' }],
        omittedMessageCount: 0,
      },
      new AbortController().signal,
    ),
  ).rejects.toThrow('Analysis is temporarily unavailable.');
});
it('maps request cancellation to a safe timeout', async () => {
  const controller = new AbortController();
  controller.abort();
  const provider = new OpenAICompatibleProvider(
    'model',
    'https://example.com',
    'key',
    vi.fn<typeof fetch>().mockRejectedValue(new Error('private details')),
  );
  await expect(
    provider.analyze(
      {
        title: 'x',
        messages: [{ authorRole: 'CUSTOMER', body: 'y' }],
        omittedMessageCount: 0,
      },
      controller.signal,
    ),
  ).rejects.toMatchObject({ code: 'AI_TIMEOUT', status: 504 });
});
it('rejects excessively large upstream output', async () => {
  const provider = new OpenAICompatibleProvider(
    'model',
    'https://example.com',
    'key',
    vi.fn<typeof fetch>().mockResolvedValue(new Response('x'.repeat(65537))),
  );
  await expect(
    provider.analyze(
      {
        title: 'x',
        messages: [{ authorRole: 'CUSTOMER', body: 'y' }],
        omittedMessageCount: 0,
      },
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' });
});
