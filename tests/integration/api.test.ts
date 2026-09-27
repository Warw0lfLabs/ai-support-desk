import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
const base = process.env.TEST_BASE_URL!;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ids: string[] = [];
const headers = { 'Content-Type': 'application/json' };
async function create(
  title = 'Integration billing question',
  description = 'Synthetic invoice details',
) {
  const r = await fetch(`${base}/api/tickets`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, description }),
  });
  expect(r.status).toBe(201);
  const t = await r.json();
  ids.push(t.id);
  return t;
}
beforeAll(() => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'))
    throw new Error('Only test databases are permitted');
});
afterAll(async () => {
  if (ids.length)
    await pool.query('DELETE FROM "Ticket" WHERE id = ANY($1::uuid[])', [ids]);
  await pool.end();
});
describe('HTTP API with PostgreSQL', () => {
  it('reports database health', async () => {
    const r = await fetch(`${base}/api/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ status: 'ok', database: 'reachable' });
  });
  it('persists ticket and initial analysis atomically', async () => {
    const t = await create();
    expect(t.analysis.state).toBe('NOT_STARTED');
    const db = await pool.query(
      'SELECT * FROM "TicketAnalysis" WHERE "ticketId"=$1',
      [t.id],
    );
    expect(db.rowCount).toBe(1);
    expect(
      (await (await fetch(`${base}/api/tickets/${t.id}`)).json()).title,
    ).toBe(t.title);
  });
  it('returns only public detail fields', async () => {
    const t = await create();
    expect(Object.keys(t).sort()).toEqual([
      'analysis',
      'conversationVersion',
      'createdAt',
      'id',
      'messages',
      'nextBeforeSequence',
      'status',
      'title',
      'updatedAt',
      'version',
    ]);
    expect(t.analysis).not.toHaveProperty('model');
  });
  it.each([
    { title: 'ok', description: 'text', ownerId: 'other' },
    { title: 'ok', description: 'text', status: 'RESOLVED' },
    { title: ' ', description: 'text' },
  ])('rejects unexpected or invalid fields %j', async (body) => {
    const r = await fetch(`${base}/api/tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    expect(r.status).toBe(422);
  });
  it('rejects malformed JSON safely', async () => {
    const r = await fetch(`${base}/api/tickets`, {
      method: 'POST',
      headers,
      body: '{',
    });
    expect(r.status).toBe(400);
    expect(await r.text()).not.toMatch(/stack|prisma|postgresql/i);
  });
  it('rejects wrong content type', async () => {
    const r = await fetch(`${base}/api/tickets`, {
      method: 'POST',
      body: '{}',
    });
    expect(r.status).toBe(415);
  });
  it('rejects an oversized body', async () => {
    const r = await fetch(`${base}/api/tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'x', description: 'x'.repeat(70000) }),
    });
    expect(r.status).toBe(413);
  });
  it('rejects cross-origin mutations', async () => {
    const r = await fetch(`${base}/api/tickets`, {
      method: 'POST',
      headers: { ...headers, Origin: 'https://untrusted.example' },
      body: '{}',
    });
    expect(r.status).toBe(403);
  });
  it('returns safe 404s for unknown and malformed IDs', async () => {
    for (const id of ['not-a-uuid', '00000000-0000-4000-8000-000000000000'])
      expect((await fetch(`${base}/api/tickets/${id}`)).status).toBe(404);
  });
  it('updates status and rejects stale versions', async () => {
    const t = await create();
    const update = () =>
      fetch(`${base}/api/tickets/${t.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'IN_PROGRESS', version: t.version }),
      });
    expect((await update()).status).toBe(200);
    expect((await update()).status).toBe(409);
  });
  it('enforces status transition rules', async () => {
    const t = await create();
    await fetch(`${base}/api/tickets/${t.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'RESOLVED', version: 1 }),
    });
    const r = await fetch(`${base}/api/tickets/${t.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'IN_PROGRESS', version: 2 }),
    });
    expect(r.status).toBe(409);
  });
  it('resolves simultaneous status updates with one conflict', async () => {
    const t = await create();
    const responses = await Promise.all(
      ['RESOLVED', 'IN_PROGRESS'].map((status) =>
        fetch(`${base}/api/tickets/${t.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status, version: 1 }),
        }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
  });
  it('analyzes with mock AI and reuses the persisted result', async () => {
    const t = await create('Charged twice for billing');
    const analyze = () =>
      fetch(`${base}/api/tickets/${t.id}/analysis`, {
        method: 'POST',
        headers,
        body: '{}',
      });
    const r = await analyze();
    expect(r.status).toBe(200);
    const result = await r.json();
    expect(result.analysis).toMatchObject({
      state: 'SUCCEEDED',
      category: 'BILLING',
      priority: 'HIGH',
      provider: 'mock',
    });
    expect((await (await analyze()).json()).analysis.updatedAt).toBe(
      result.analysis.updatedAt,
    );
  });
  it('combines literal search and AI filters', async () => {
    const t = await create('Unique 100%_ literal invoice');
    await fetch(`${base}/api/tickets/${t.id}/analysis`, {
      method: 'POST',
      headers,
      body: '{}',
    });
    const r = await fetch(
      `${base}/api/tickets?q=${encodeURIComponent('100%_')}&status=OPEN&category=BILLING&priority=MEDIUM`,
    );
    const body = await r.json();
    expect(body.items.map((item: { id: string }) => item.id)).toEqual([t.id]);
  });
  it('paginates without including full ticket content', async () => {
    await create('Pagination alpha');
    await create('Pagination beta');
    const first = await (
      await fetch(`${base}/api/tickets?q=Pagination&pageSize=1`)
    ).json();
    const second = await (
      await fetch(`${base}/api/tickets?q=Pagination&pageSize=1&page=2`)
    ).json();
    expect(first.totalItems).toBe(2);
    expect(first.totalPages).toBe(2);
    expect(first.items[0].id).not.toBe(second.items[0].id);
    expect(first.items[0]).not.toHaveProperty('description');
    expect(first.items[0].analysis).not.toHaveProperty('suggestedResponse');
  });
  it('returns empty results beyond the last page', async () => {
    const body = await (await fetch(`${base}/api/tickets?page=10000`)).json();
    expect(body.items).toEqual([]);
  });
  it.each([
    'page=0',
    'page=1&page=2',
    'status=INVALID',
    'pageSize=101',
    'ownerId=1',
  ])('rejects bad query %s', async (query) => {
    expect((await fetch(`${base}/api/tickets?${query}`)).status).toBe(400);
  });
  it('treats SQL-shaped text as data', async () => {
    const t = await create("Quote ' OR 1=1 --", 'Synthetic');
    const r = await fetch(
      `${base}/api/tickets?q=${encodeURIComponent("' OR 1=1 --")}`,
    );
    expect((await r.json()).items.map((x: { id: string }) => x.id)).toEqual([
      t.id,
    ]);
  });
  it('sets no-store and browser security headers', async () => {
    const r = await fetch(`${base}/api/tickets`);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('content-security-policy')).toContain(
      "object-src 'none'",
    );
    expect(r.headers.get('x-request-id')).toBeTruthy();
  });
  it('enforces the database successful-analysis constraint', async () => {
    const t = await create();
    await expect(
      pool.query(
        `UPDATE "TicketAnalysis" SET state='SUCCEEDED' WHERE "ticketId"=$1`,
        [t.id],
      ),
    ).rejects.toThrow();
  });
});

async function postMessage(id: string, body: unknown, demo = false) {
  return fetch(
    `${base}/api/tickets/${id}/${demo ? 'demo-customer-messages' : 'messages'}`,
    { method: 'POST', headers, body: JSON.stringify(body) },
  );
}
describe('ticket conversations', () => {
  it('stores description only as the opening customer message', async () => {
    const t = await create('Conversation opening', 'Opening content');
    expect(t).not.toHaveProperty('description');
    expect(t.conversationVersion).toBe(1);
    expect(t.messages).toHaveLength(1);
    expect(t.messages[0]).toMatchObject({
      sequence: 1,
      authorRole: 'CUSTOMER',
      body: 'Opening content',
    });
    const columns = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='Ticket' AND column_name='description'",
    );
    expect(columns.rowCount).toBe(0);
  });
  it('assigns support and demo customer roles on the server', async () => {
    const t = await create();
    const support = await postMessage(t.id, {
      body: 'Please share the reference.',
      clientMessageId: crypto.randomUUID(),
      expectedConversationVersion: 1,
    });
    expect(support.status).toBe(201);
    expect(await support.json()).toMatchObject({
      authorRole: 'SUPPORT',
      sequence: 2,
    });
    const customer = await postMessage(
      t.id,
      {
        body: 'Reference DEMO-81.',
        clientMessageId: crypto.randomUUID(),
        expectedConversationVersion: 2,
      },
      true,
    );
    expect(customer.status).toBe(201);
    const saved = await (await fetch(`${base}/api/tickets/${t.id}`)).json();
    expect(saved.conversationVersion).toBe(3);
    expect(saved.version).toBe(1);
    expect(
      saved.messages.map((m: { authorRole: string }) => m.authorRole),
    ).toEqual(['CUSTOMER', 'SUPPORT', 'CUSTOMER']);
  });
  it.each([
    {
      body: ' ',
      clientMessageId: crypto.randomUUID(),
      expectedConversationVersion: 1,
    },
    {
      body: 'x'.repeat(10001),
      clientMessageId: crypto.randomUUID(),
      expectedConversationVersion: 1,
    },
    {
      body: 'reply',
      clientMessageId: crypto.randomUUID(),
      expectedConversationVersion: 0,
    },
    {
      body: 'reply',
      clientMessageId: crypto.randomUUID(),
      expectedConversationVersion: 1,
      authorRole: 'CUSTOMER',
    },
    {
      body: 'reply',
      clientMessageId: crypto.randomUUID(),
      expectedConversationVersion: 1,
      createdAt: '2026-01-01',
    },
  ])('rejects invalid message input and mass assignment %j', async (body) => {
    const t = await create();
    expect((await postMessage(t.id, body)).status).toBe(422);
  });
  it('rejects concurrent distinct submissions against one revision', async () => {
    const t = await create();
    const input = {
      body: 'One reply',
      clientMessageId: crypto.randomUUID(),
      expectedConversationVersion: 1,
    };
    const replies = await Promise.all([
      postMessage(t.id, input),
      postMessage(t.id, { ...input, clientMessageId: crypto.randomUUID() }),
    ]);
    expect(replies.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      (
        await postMessage(t.id, {
          ...input,
          clientMessageId: crypto.randomUUID(),
        })
      ).status,
    ).toBe(409);
    const saved = await (await fetch(`${base}/api/tickets/${t.id}`)).json();
    expect(saved.conversationVersion).toBe(2);
    expect(saved.messages).toHaveLength(2);
  });
  it('marks old analysis stale and refreshes against the new conversation', async () => {
    const t = await create('A question', 'Could you help?');
    const analyze = () =>
      fetch(`${base}/api/tickets/${t.id}/analysis`, {
        method: 'POST',
        headers,
        body: '{}',
      });
    const first = await (await analyze()).json();
    expect(first.analysis).toMatchObject({
      isStale: false,
      analyzedConversationVersion: 1,
    });
    await postMessage(
      t.id,
      {
        body: 'An outage affects all users. DEMO-NEW-CONTEXT.',
        clientMessageId: crypto.randomUUID(),
        expectedConversationVersion: 1,
      },
      true,
    );
    const stale = await (await fetch(`${base}/api/tickets/${t.id}`)).json();
    expect(stale.analysis.isStale).toBe(true);
    expect(stale.analysis.summary).toBe(first.analysis.summary);
    const current = await (await analyze()).json();
    expect(current.analysis).toMatchObject({
      isStale: false,
      analyzedConversationVersion: 2,
      priority: 'URGENT',
    });
    expect(current.analysis.summary).toContain('DEMO-NEW-CONTEXT');
    expect(current.messages).toHaveLength(2); // AI never appends a reply.
  });
  it('does not make analysis stale when only status changes', async () => {
    const t = await create();
    await fetch(`${base}/api/tickets/${t.id}/analysis`, {
      method: 'POST',
      headers,
      body: '{}',
    });
    const changed = await fetch(`${base}/api/tickets/${t.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'RESOLVED', version: 1 }),
    });
    expect((await changed.json()).analysis.isStale).toBe(false);
  });
  it('searches message bodies without duplicating matching tickets', async () => {
    const t = await create('Message search fixture', 'Opening text');
    await postMessage(t.id, {
      body: 'Searchable followup 100%_CONVERSATION',
      clientMessageId: crypto.randomUUID(),
      expectedConversationVersion: 1,
    });
    const result = await (
      await fetch(
        `${base}/api/tickets?q=${encodeURIComponent('100%_CONVERSATION')}`,
      )
    ).json();
    expect(result.items.map((x: { id: string }) => x.id)).toEqual([t.id]);
  });
  it('pages older messages in stable sequence order', async () => {
    const t = await create();
    await pool.query(
      `INSERT INTO "TicketMessage" (id, "ticketId", sequence, "authorRole", body) SELECT gen_random_uuid(), $1::uuid, n, 'SUPPORT', 'Synthetic historical reply ' || n FROM generate_series(2,55) AS n`,
      [t.id],
    );
    await pool.query(
      'UPDATE "Ticket" SET "conversationVersion"=55 WHERE id=$1',
      [t.id],
    );
    const latest = await (
      await fetch(`${base}/api/tickets/${t.id}/messages`)
    ).json();
    expect(latest.items).toHaveLength(50);
    expect(latest.items[0].sequence).toBe(6);
    expect(latest.nextBeforeSequence).toBe(6);
    await postMessage(t.id, {
      body: 'Newest reply',
      clientMessageId: crypto.randomUUID(),
      expectedConversationVersion: 55,
    });
    const earlier = await (
      await fetch(`${base}/api/tickets/${t.id}/messages?before=6`)
    ).json();
    expect(earlier.items.map((m: { sequence: number }) => m.sequence)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(earlier.nextBeforeSequence).toBeNull();
    const analyzed = await (
      await fetch(`${base}/api/tickets/${t.id}/analysis`, {
        method: 'POST',
        headers,
        body: '{}',
      })
    ).json();
    expect(analyzed.analysis.omittedMessageCount).toBe(35);
  });
  it('rejects invalid message pagination and unknown tickets', async () => {
    const t = await create();
    for (const query of [
      'before=0',
      'before=x',
      'before=2&before=3',
      'role=CUSTOMER',
    ])
      expect(
        (await fetch(`${base}/api/tickets/${t.id}/messages?${query}`)).status,
      ).toBe(400);
    expect(
      (
        await fetch(
          `${base}/api/tickets/00000000-0000-4000-8000-000000000000/messages`,
        )
      ).status,
    ).toBe(404);
  });
  it('enforces the demo flag on the server', async () => {
    const t = await create();
    const r = await fetch(
      `${process.env.TEST_DISABLED_BASE_URL}/api/tickets/${t.id}/demo-customer-messages`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          body: 'Synthetic',
          clientMessageId: crypto.randomUUID(),
          expectedConversationVersion: 1,
        }),
      },
    );
    expect(r.status).toBe(404);
    const saved = await (await fetch(`${base}/api/tickets/${t.id}`)).json();
    expect(saved.conversationVersion).toBe(1);
  });
});

// Replays return the original message; expected revision is deliberately ignored only for an exact replay.
it.each([false, true])(
  'retries an ambiguously delivered message once (demo=%s)',
  async (demo) => {
    const t = await create();
    const input = {
      body: 'A logical reply',
      clientMessageId: crypto.randomUUID(),
      expectedConversationVersion: 1,
    };
    const committed = await postMessage(t.id, input, demo);
    expect(committed.status).toBe(201);
    // The client discards the first response, as if delivery was lost after commit.
    const retry = await postMessage(
      t.id,
      { ...input, expectedConversationVersion: 2 },
      demo,
    );
    expect(retry.status).toBe(201);
    const original = await committed.json();
    expect(await retry.json()).toEqual(original);
    expect(
      (await postMessage(t.id, { ...input, body: 'Different content' }, demo))
        .status,
    ).toBe(409);
    expect((await postMessage(t.id, input, !demo)).status).toBe(409);
    const next = await postMessage(
      t.id,
      {
        ...input,
        clientMessageId: crypto.randomUUID(),
        expectedConversationVersion: 2,
      },
      demo,
    );
    expect(next.status).toBe(201);
    const saved = await (await fetch(`${base}/api/tickets/${t.id}`)).json();
    expect(saved.conversationVersion).toBe(3);
    expect(saved.messages.map((m: { sequence: number }) => m.sequence)).toEqual(
      [1, 2, 3],
    );
    const duplicates = await pool.query(
      'SELECT count(*)::int AS count FROM "TicketMessage" WHERE "ticketId"=$1 AND "clientMessageId"=$2',
      [t.id, input.clientMessageId],
    );
    expect(duplicates.rows[0].count).toBe(1);
  },
);
it('serializes simultaneous exact retries without incrementing twice', async () => {
  const t = await create();
  const input = {
    body: 'One submission',
    clientMessageId: crypto.randomUUID(),
    expectedConversationVersion: 1,
  };
  const replies = await Promise.all([
    postMessage(t.id, input),
    postMessage(t.id, input),
  ]);
  expect(replies.map((r) => r.status)).toEqual([201, 201]);
  expect(await replies[0]!.json()).toEqual(await replies[1]!.json());
  const saved = await (await fetch(`${base}/api/tickets/${t.id}`)).json();
  expect(saved.conversationVersion).toBe(2);
  expect(saved.messages).toHaveLength(2);
});
it('requires a valid submission identifier', async () => {
  const t = await create();
  for (const extra of [{}, { clientMessageId: 'invalid' }])
    expect(
      (
        await postMessage(t.id, {
          body: 'Reply',
          expectedConversationVersion: 1,
          ...extra,
        })
      ).status,
    ).toBe(422);
});
it('exposes stale classifications in list summaries, preserving last-known filters', async () => {
  const t = await create('Stale dashboard billing fixture');
  await fetch(`${base}/api/tickets/${t.id}/analysis`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  const list = async () =>
    (
      await (
        await fetch(
          `${base}/api/tickets?q=Stale%20dashboard%20billing%20fixture&category=BILLING`,
        )
      ).json()
    ).items[0];
  expect((await list()).analysis.isStale).toBe(false);
  await postMessage(
    t.id,
    {
      body: 'New information',
      clientMessageId: crypto.randomUUID(),
      expectedConversationVersion: 1,
    },
    true,
  );
  expect((await list()).analysis).toMatchObject({
    category: 'BILLING',
    isStale: true,
  });
});
