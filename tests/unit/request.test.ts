import { expect, it } from 'vitest';
import {
  readJson,
  parseQuery,
  MAX_BODY_BYTES,
} from '../../src/server/http/request';
import { listTicketsSchema } from '../../src/features/tickets/schemas';
it('rejects malformed JSON', async () => {
  await expect(
    readJson(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }),
    ),
  ).rejects.toMatchObject({ status: 400 });
});
it('requires JSON content type', async () => {
  await expect(
    readJson(new Request('http://localhost', { method: 'POST', body: '{}' })),
  ).rejects.toMatchObject({ status: 415 });
});
it('bounds streamed bodies without content-length', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_BODY_BYTES));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    }),
    duplex: 'half',
  } as RequestInit);
  await expect(readJson(request)).rejects.toMatchObject({ status: 413 });
});
it('rejects duplicate query fields', () =>
  expect(() =>
    parseQuery(new URLSearchParams('page=1&page=2'), listTicketsSchema),
  ).toThrow('Repeated'));
it('rejects unknown query fields', () =>
  expect(() =>
    parseQuery(new URLSearchParams('ownerId=other'), listTicketsSchema),
  ).toThrow('Invalid'));
