// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { TicketDTO } from '../../src/features/tickets/contracts';
const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('../../src/features/tickets/client-api', () => ({
  mutate: mocks.mutate,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { TicketWorkspace } from '../../src/features/tickets/components/ticket-workspace';
const ticket: TicketDTO = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Question',
  status: 'OPEN',
  version: 1,
  conversationVersion: 1,
  createdAt: '2026-09-26T10:00:00Z',
  updatedAt: '2026-09-26T10:00:00Z',
  nextBeforeSequence: null,
  messages: [
    {
      id: '00000000-0000-4000-8000-000000000002',
      sequence: 1,
      authorRole: 'CUSTOMER',
      body: 'Please help.',
      createdAt: '2026-09-26T10:00:00Z',
    },
  ],
  analysis: {
    state: 'SUCCEEDED',
    summary: 'Summary',
    category: 'OTHER',
    priority: 'MEDIUM',
    suggestedResponse: 'Suggested reply',
    provider: 'mock',
    lastErrorCode: null,
    updatedAt: '2026-09-26T10:00:00Z',
    analyzedConversationVersion: 1,
    omittedMessageCount: 0,
    isStale: false,
  },
};
beforeEach(() => {
  mocks.mutate.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ticket }),
  );
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('inserts a draft without sending, and requires confirmation before replacement', () => {
  render(
    <TicketWorkspace
      initialTicket={ticket}
      demoCustomerReplies
      autoAnalyze={false}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Use reply' }));
  const composer = screen.getByRole('textbox', {
    name: 'Support reply',
  });
  expect(composer).toHaveValue('Suggested reply');
  expect(composer).toHaveFocus();
  expect(mocks.mutate).not.toHaveBeenCalled();
  fireEvent.change(composer, { target: { value: 'My edited reply' } });
  fireEvent.click(screen.getByRole('button', { name: 'Use reply' }));
  expect(composer).toHaveValue('My edited reply');
  fireEvent.click(screen.getByRole('button', { name: 'Keep my draft' }));
  expect(composer).toHaveValue('My edited reply');
  fireEvent.click(screen.getByRole('button', { name: 'Use reply' }));
  fireEvent.click(screen.getByRole('button', { name: 'Replace draft' }));
  expect(composer).toHaveValue('Suggested reply');
  expect(mocks.mutate).not.toHaveBeenCalled();
});
it('blocks stale suggestions and hides demo controls when disabled', () => {
  render(
    <TicketWorkspace
      initialTicket={{
        ...ticket,
        analysis: { ...ticket.analysis, isStale: true },
      }}
      demoCustomerReplies={false}
      autoAnalyze={false}
    />,
  );
  expect(screen.getByRole('button', { name: 'Use reply' })).toBeDisabled();
  expect(screen.getByText('Analysis is out of date.')).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Add customer reply' }),
  ).not.toBeInTheDocument();
});
it('preserves the support draft after a failed send', async () => {
  mocks.mutate.mockRejectedValue(new Error('Request failed.'));
  render(
    <TicketWorkspace
      initialTicket={ticket}
      demoCustomerReplies
      autoAnalyze={false}
    />,
  );
  const composer = screen.getByRole('textbox', {
    name: 'Support reply',
  });
  fireEvent.change(composer, { target: { value: 'Keep this reply' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Request failed.'),
  );
  expect(composer).toHaveValue('Keep this reply');
});
it('sends only the edited draft on explicit submission and clears after success', async () => {
  mocks.mutate.mockResolvedValue({ sequence: 2 });
  render(
    <TicketWorkspace
      initialTicket={ticket}
      demoCustomerReplies
      autoAnalyze={false}
    />,
  );
  const composer = screen.getByRole('textbox', {
    name: 'Support reply',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Use reply' }));
  fireEvent.change(composer, { target: { value: 'Edited by agent' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
  await waitFor(() => expect(composer).toHaveValue(''));
  expect(mocks.mutate).toHaveBeenCalledWith(
    `/api/tickets/${ticket.id}/messages`,
    'POST',
    {
      body: 'Edited by agent',
      expectedConversationVersion: 1,
      clientMessageId: expect.any(String),
    },
  );
});
it('keeps prior analysis visible when a refresh failed', () => {
  render(
    <TicketWorkspace
      initialTicket={{
        ...ticket,
        analysis: { ...ticket.analysis, state: 'FAILED', isStale: true },
      }}
      demoCustomerReplies
      autoAnalyze={false}
    />,
  );
  expect(screen.getByText('Summary', { selector: 'p' })).toBeVisible();
  expect(screen.getByText('Suggested reply')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Use reply' })).toBeDisabled();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
const renderWorkspace = () =>
  render(
    <TicketWorkspace
      initialTicket={ticket}
      demoCustomerReplies
      autoAnalyze={false}
    />,
  );
const newer: TicketDTO = {
  ...ticket,
  conversationVersion: 2,
  analysis: { ...ticket.analysis, isStale: true },
};
it('ignores reversed refresh responses and cannot re-enable a stale suggestion', async () => {
  const first = deferred<Response>();
  const second = deferred<Response>();
  vi.mocked(fetch)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  renderWorkspace();
  const button = screen.getByRole('button', { name: 'Refresh conversation' });
  fireEvent.click(button);
  fireEvent.click(button);
  await act(async () => second.resolve(Response.json(newer)));
  expect(screen.getByRole('button', { name: 'Use reply' })).toBeDisabled();
  await act(async () => first.resolve(Response.json(ticket)));
  expect(screen.getByText('Analysis is out of date.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Use reply' })).toBeDisabled();
});
it('keeps analysis unusable when append succeeds but synchronization fails, preserving another draft', async () => {
  mocks.mutate.mockResolvedValue({ sequence: 2 });
  vi.mocked(fetch).mockRejectedValue(new Error('offline'));
  renderWorkspace();
  const composer = screen.getByRole('textbox', { name: 'Support reply' });
  fireEvent.change(composer, { target: { value: 'Keep my support draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add customer reply' }));
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Simulated customer reply' }),
    { target: { value: 'More detail' } },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add simulated reply' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Could not refresh'),
  );
  expect(composer).toHaveValue('Keep my support draft');
  expect(screen.getByRole('button', { name: 'Use reply' })).toBeDisabled();
  expect(screen.getByText('Analysis is out of date.')).toBeVisible();
});
it('invalidates a pre-write refresh even if it completes after a failed post-write refresh', async () => {
  const old = deferred<Response>();
  vi.mocked(fetch)
    .mockReturnValueOnce(old.promise)
    .mockRejectedValueOnce(new Error('offline'));
  mocks.mutate.mockResolvedValue({ sequence: 2 });
  renderWorkspace();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh conversation' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Support reply' }), {
    target: { value: 'Reply' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Could not refresh'),
  );
  await act(async () => old.resolve(Response.json(ticket)));
  expect(screen.getByRole('button', { name: 'Use reply' })).toBeDisabled();
  expect(screen.getByText('Analysis is out of date.')).toBeVisible();
});
it.each(['support', 'customer'] as const)(
  'reuses the logical submission ID after a lost response (%s)',
  async (kind) => {
    mocks.mutate
      .mockRejectedValueOnce(new Error('Connection interrupted.'))
      .mockResolvedValue({ sequence: 2 });
    vi.mocked(fetch).mockImplementation(async () => Response.json(newer));
    renderWorkspace();
    if (kind === 'customer')
      fireEvent.click(
        screen.getByRole('button', { name: 'Add customer reply' }),
      );
    const composer = screen.getByRole('textbox', {
      name: kind === 'support' ? 'Support reply' : 'Simulated customer reply',
    });
    const send = () =>
      screen.getByRole('button', {
        name: kind === 'support' ? 'Send reply' : 'Add simulated reply',
      });
    fireEvent.change(composer, { target: { value: 'Logical reply' } });
    fireEvent.click(send());
    await waitFor(() => expect(send()).toBeEnabled());
    expect(composer).toHaveValue('Logical reply');
    fireEvent.click(send());
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(2));
    const first = mocks.mutate.mock.calls[0]![2];
    const retry = mocks.mutate.mock.calls[1]![2];
    expect(retry.clientMessageId).toBe(first.clientMessageId);
    expect(retry.expectedConversationVersion).toBe(2);
    if (kind === 'support')
      await waitFor(() => expect(composer).toHaveValue(''));
    else
      await waitFor(() =>
        expect(
          screen.queryByRole('textbox', { name: 'Simulated customer reply' }),
        ).not.toBeInTheDocument(),
      );
    if (kind === 'customer')
      fireEvent.click(
        screen.getByRole('button', { name: 'Add customer reply' }),
      );
    const nextComposer = screen.getByRole('textbox', {
      name: kind === 'support' ? 'Support reply' : 'Simulated customer reply',
    });
    expect(nextComposer).toHaveValue('');
    fireEvent.change(nextComposer, { target: { value: 'A new message' } });
    fireEvent.click(send());
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(3));
    expect(mocks.mutate.mock.calls[2]![2].clientMessageId).not.toBe(
      first.clientMessageId,
    );
  },
);
it('refreshes the header badge and status control from the same snapshot', async () => {
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ ...ticket, status: 'RESOLVED', version: 2 }),
  );
  renderWorkspace();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh conversation' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Ticket status')).toHaveValue('RESOLVED'),
  );
  expect(screen.getByText('Resolved', { selector: 'span' })).toBeVisible();
  expect(
    screen.queryByText('Open', { selector: 'span' }),
  ).not.toBeInTheDocument();
});
