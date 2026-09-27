import { expect, it } from 'vitest';
import { MockAIProvider } from '../../src/server/ai/mock-provider';
import { analysisSchema } from '../../src/features/analysis/schemas';
const provider = new MockAIProvider();
it('returns identical schema-valid results for repeated input', async () => {
  const input = {
    title: '  Billing question ',
    messages: [{ authorRole: 'CUSTOMER' as const, body: 'Charged twice' }],
    omittedMessageCount: 0,
  };
  const first = await provider.analyze(input);
  expect(first).toEqual(await provider.analyze(input));
  expect(analysisSchema.safeParse(first).success).toBe(true);
});
it.each([
  ['Service outage affects all users', 'TECHNICAL', 'URGENT'],
  ['Charged twice for billing', 'BILLING', 'HIGH'],
  ['Cannot login to account', 'ACCOUNT', 'HIGH'],
  ['Feature request for export', 'FEATURE_REQUEST', 'LOW'],
  ['General question', 'OTHER', 'MEDIUM'],
])('classifies %s', async (title, category, priority) =>
  expect(
    await provider.analyze({
      title,
      messages: [{ authorRole: 'CUSTOMER', body: 'Synthetic details' }],
      omittedMessageCount: 0,
    }),
  ).toMatchObject({ category, priority }),
);
it('does not reproduce secret-shaped description in a response', async () => {
  const result = await provider.analyze({
    title: 'Account question',
    messages: [{ authorRole: 'CUSTOMER', body: 'password is secret-sentinel' }],
    omittedMessageCount: 0,
  });
  expect(result.suggestedResponse).not.toContain('secret-sentinel');
});

it('uses the newest customer context and does not repeat the original question', async () => {
  const input = {
    title: 'Billing question',
    messages: [{ authorRole: 'CUSTOMER' as const, body: 'A billing question' }],
    omittedMessageCount: 0,
  };
  const original = await provider.analyze(input);
  const followup = await provider.analyze({
    ...input,
    messages: [
      ...input.messages,
      { authorRole: 'SUPPORT', body: 'Which invoice?' },
      {
        authorRole: 'CUSTOMER',
        body: 'Invoice DEMO-55, charged twice, all users blocked.',
      },
    ],
  });
  expect(followup.summary).toContain('DEMO-55');
  expect(followup.priority).toBe('URGENT');
  expect(followup.suggestedResponse).not.toBe(original.suggestedResponse);
  expect(followup.suggestedResponse).not.toContain('share the invoice');
});
it('accounts for a support reply as the latest message', async () => {
  const result = await provider.analyze({
    title: 'Question',
    messages: [
      { authorRole: 'CUSTOMER', body: 'Question' },
      { authorRole: 'SUPPORT', body: 'Here is some guidance.' },
    ],
    omittedMessageCount: 0,
  });
  expect(result.suggestedResponse).toContain('When you have an update');
});

it.each([
  [
    'Duplicate billing',
    'Payment was charged twice for my September subscription.',
    'The duplicate charge is €49.99. My invoice number is INV-48291 and both charges appeared today.',
    ['INV-48291', '€49.99', 'duplicate charges'],
    ['Please share the invoice', 'refund has'],
  ],
  [
    'Billing issue',
    'A duplicate charge appeared.',
    'Reference REF-718 costs $12.50 and appeared yesterday.',
    ['REF-718', '$12.50', 'yesterday'],
    ['Please share the invoice'],
  ],
  [
    'Cannot login',
    'My account login fails.',
    'The password reset link has expired.',
    ['expired reset link', 'most recent email'],
    ['What error message'],
  ],
  [
    'Technical error',
    'Reports fail with an error.',
    'After opening reports in Firefox 130, HTTP 500 appears today.',
    ['HTTP 500', 'Firefox 130', 'reproduction steps', 'today'],
    ['Please share the steps', 'Which browser'],
  ],
  [
    'Feature request',
    'We would like CSV export.',
    'CSV export would help for internal planning.',
    ['CSV export', 'workflow and intended outcome'],
    ['How would this change improve'],
  ],
])(
  'provides useful deterministic context for %s',
  async (title, opening, followup, required, forbidden) => {
    const input = {
      title,
      messages: [
        { authorRole: 'CUSTOMER' as const, body: opening },
        { authorRole: 'SUPPORT' as const, body: 'Please share details.' },
        { authorRole: 'CUSTOMER' as const, body: followup },
      ],
      omittedMessageCount: 0,
    };
    const result = await provider.analyze(input);
    expect(result).toEqual(await provider.analyze(input));
    expect(analysisSchema.safeParse(result).success).toBe(true);
    for (const detail of required)
      expect(result.suggestedResponse).toContain(detail);
    for (const phrase of forbidden)
      expect(result.suggestedResponse).not.toContain(phrase);
    expect(result.suggestedResponse).not.toMatch(
      /we (?:have )?(?:refunded|investigated|fixed|escalated|deployed)/i,
    );
  },
);
it('uses details already supplied in the opening message', async () => {
  const result = await provider.analyze({
    title: 'Duplicate payment',
    messages: [
      {
        authorRole: 'CUSTOMER',
        body: 'Invoice INV-917 for £19.00 was charged twice today.',
      },
    ],
    omittedMessageCount: 0,
  });
  expect(result.suggestedResponse).toContain('INV-917');
  expect(result.suggestedResponse).toContain('£19.00');
  expect(result.suggestedResponse).not.toContain('Please share');
});
it('acknowledges a supplied login error instead of asking for it again', async () => {
  const result = await provider.analyze({
    title: 'Cannot login',
    messages: [
      {
        authorRole: 'CUSTOMER',
        body: 'Login says invalid credentials in Chrome 130.',
      },
    ],
    omittedMessageCount: 0,
  });
  expect(result.suggestedResponse).toContain('invalid credentials');
  expect(result.suggestedResponse).toContain('Chrome 130');
  expect(result.suggestedResponse).not.toContain('What error message');
});
it('does not invent an expired reset link when only an account expired', async () => {
  const result = await provider.analyze({
    title: 'Account access',
    messages: [
      { authorRole: 'CUSTOMER', body: 'My account expired yesterday.' },
    ],
    omittedMessageCount: 0,
  });
  expect(result.suggestedResponse).not.toContain('reset link');
  expect(result.suggestedResponse).toContain('access problem');
});
