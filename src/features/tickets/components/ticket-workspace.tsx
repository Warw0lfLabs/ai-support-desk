'use client';
import { useCallback, useRef, useState } from 'react';
import {
  MessageSquare,
  UserRound,
  Headphones,
  Send,
  FlaskConical,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { MessageDTO, MessagePageDTO, TicketDTO } from '../contracts';
import { appendMessageSchema } from '../schemas';
import { mutate } from '../client-api';
import { AnalysisPanel } from '@/features/analysis/components/analysis-panel';
import { Badge } from '@/components/badge';
import { StatusControl } from './status-control';
const date = (value: string) =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
export function TicketWorkspace({
  initialTicket,
  demoCustomerReplies,
  autoAnalyze,
}: {
  initialTicket: TicketDTO;
  demoCustomerReplies: boolean;
  autoAnalyze: boolean;
}) {
  const [ticket, setTicket] = useState(initialTicket);
  const [older, setOlder] = useState<MessageDTO[]>([]);
  const [cursor, setCursor] = useState<number | null | undefined>(undefined);
  const generation = useRef(0);
  const snapshot = useRef(initialTicket);
  const sending = useRef(false);
  const submissions = useRef<
    Partial<
      Record<'support' | 'customer', { body: string; clientMessageId: string }>
    >
  >({});
  const [uncertain, setUncertain] = useState(false);
  const [draft, setDraft] = useState('');
  const [replacement, setReplacement] = useState<string | null>(null);
  const [customerDraft, setCustomerDraft] = useState('');
  const [demoOpen, setDemoOpen] = useState(false);
  const [pending, setPending] = useState<'support' | 'customer' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const composer = useRef<HTMLTextAreaElement>(null);
  const refresh = useCallback(async () => {
    const requestGeneration = ++generation.current;
    setUncertain(true);
    try {
      const r = await fetch(`/api/tickets/${initialTicket.id}`, {
        cache: 'no-store',
      });
      if (!r.ok) throw new Error();
      const next = (await r.json()) as TicketDTO;
      if (requestGeneration !== generation.current) return;
      if (
        next.conversationVersion < snapshot.current.conversationVersion ||
        next.version < snapshot.current.version
      )
        throw new Error();
      snapshot.current = next;
      setTicket(next);
      setUncertain(false);
      setOlder([]);
      setCursor(undefined);
      setReplacement(null);
    } catch {
      if (requestGeneration !== generation.current) return;
      setError(
        'Could not refresh the conversation. Your draft is preserved. Please try Refresh conversation.',
      );
    }
  }, [initialTicket.id]);
  const before = cursor === undefined ? ticket.nextBeforeSequence : cursor;
  const messages = [
    ...new Map([...older, ...ticket.messages].map((m) => [m.id, m])).values(),
  ].sort((a, b) => a.sequence - b.sequence);
  async function loadEarlier() {
    if (!before) return;
    const requestGeneration = generation.current;
    setLoading(true);
    setError('');
    try {
      const r = await fetch(
        `/api/tickets/${ticket.id}/messages?before=${before}`,
        { cache: 'no-store' },
      );
      if (!r.ok) throw new Error();
      const page = (await r.json()) as MessagePageDTO;
      if (requestGeneration !== generation.current) return;
      setOlder((existing) => [...page.items, ...existing]);
      setCursor(page.nextBeforeSequence);
    } catch {
      setError('Could not load earlier messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  async function send(kind: 'support' | 'customer') {
    if (sending.current) return;
    const body = (kind === 'support' ? draft : customerDraft).trim();
    const previous = submissions.current[kind];
    const submission =
      previous?.body === body
        ? previous
        : { body, clientMessageId: crypto.randomUUID() };
    submissions.current[kind] = submission;
    const parsed = appendMessageSchema.safeParse({
      ...submission,
      expectedConversationVersion: ticket.conversationVersion,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your reply.');
      return;
    }
    sending.current = true;
    ++generation.current;
    setUncertain(true);
    setReplacement(null);
    setPending(kind);
    setError('');
    setNotice('');
    try {
      const saved = await mutate<MessageDTO>(
        `/api/tickets/${ticket.id}/${kind === 'support' ? 'messages' : 'demo-customer-messages'}`,
        'POST',
        parsed.data,
      );
      ++generation.current;
      const next = {
        ...snapshot.current,
        conversationVersion: Math.max(
          snapshot.current.conversationVersion,
          saved.sequence,
        ),
        analysis: { ...snapshot.current.analysis, isStale: true },
      };
      snapshot.current = next;
      setTicket(next);
      delete submissions.current[kind];
      if (kind === 'support') {
        setDraft('');
        setReplacement(null);
      } else {
        setCustomerDraft('');
        setDemoOpen(false);
      }
      setNotice(
        kind === 'support'
          ? 'Support reply added to the conversation.'
          : 'Simulated customer reply added to the conversation.',
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not save the reply. Your draft is preserved.',
      );
    } finally {
      await refresh();
      sending.current = false;
      setPending(null);
    }
  }
  function insertReply(body: string) {
    if (draft.trim()) {
      setReplacement(body);
      composer.current?.focus();
      return;
    }
    setDraft(body);
    setReplacement(null);
    composer.current?.focus();
    composer.current?.scrollIntoView({ behavior: 'instant', block: 'center' });
    setNotice(
      'AI suggestion added to the support draft. Edit it before sending.',
    );
  }
  return (
    <>
      <div className="mb-7">
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-xs text-[#6e6774]">
            #{ticket.id.slice(-8).toUpperCase()}
          </span>
          <Badge value={ticket.status} dot />
        </div>
        <h1 className="max-w-4xl break-words text-[26px] leading-tight font-semibold tracking-tight">
          {ticket.title}
        </h1>
        <p className="mt-3 text-xs text-muted">
          Every detail in one place. Every next step considered.
        </p>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[1.25fr_1fr]">
        <div className="min-w-0 space-y-5">
          <section
            className="panel overflow-hidden"
            aria-labelledby="conversation-heading"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9ebf0] p-5">
              <h2
                id="conversation-heading"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <MessageSquare size={17} className="text-brand" />
                Conversation
                <span className="rounded-md bg-[#f1eff7] px-2 py-0.5 text-[11px] text-[#726389]">
                  {ticket.conversationVersion}
                </span>
              </h2>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-muted hover:text-brand"
                disabled={pending !== null}
                onClick={() => {
                  setError('');
                  void refresh();
                }}
              >
                <RefreshCw size={13} />
                Refresh conversation
              </button>
            </div>
            {before !== null && (
              <div className="border-b border-[#e9ebf0] p-3 text-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadEarlier()}
                  className="btn btn-secondary !py-2"
                >
                  {loading ? 'Loading…' : 'Load earlier messages'}
                </button>
              </div>
            )}
            <ol
              aria-label="Conversation messages"
              className="divide-y divide-[#e9ebf0]"
            >
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={`p-5 sm:p-6 ${message.authorRole === 'SUPPORT' ? 'border-l-[3px] border-l-[#a99bd7] bg-[#faf8fe]' : 'border-l-[3px] border-l-transparent bg-white'}`}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md p-1.5 ${message.authorRole === 'SUPPORT' ? 'bg-[#eee8fa] text-brand' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {message.authorRole === 'SUPPORT' ? (
                        <Headphones size={15} />
                      ) : (
                        <UserRound size={15} />
                      )}
                    </span>
                    <h3 className="text-xs font-semibold">
                      {message.authorRole === 'SUPPORT'
                        ? 'Support'
                        : 'Customer'}
                    </h3>
                    <span className="text-[10px] text-muted">
                      #{message.sequence}
                    </span>
                    <time
                      dateTime={message.createdAt}
                      className="ml-auto text-[10px] text-muted"
                    >
                      {date(message.createdAt)} UTC
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-7 text-[#535d6c]">
                    {message.body}
                  </p>
                </li>
              ))}
            </ol>
          </section>
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-800"
            >
              {error}
            </p>
          )}
          <p role="status" className="text-xs leading-5 text-[#426b56]">
            {notice}
          </p>
          <section className="panel p-5 sm:p-6" aria-labelledby="reply-heading">
            <h2 id="reply-heading" className="mb-1 text-sm font-semibold">
              Reply as support
            </h2>
            <p className="mb-5 text-xs leading-5 text-muted">
              Write your reply, or use an AI suggestion as a starting point.
              Replies stay in this demo conversation; no email is sent.
            </p>
            {replacement !== null && (
              <div
                role="group"
                aria-label="Replace draft confirmation"
                className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
              >
                <p>
                  You already have a draft. Replace it with the AI suggestion?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={
                      pending !== null ||
                      uncertain ||
                      ticket.analysis.isStale ||
                      ticket.analysis.state !== 'SUCCEEDED'
                    }
                    onClick={() => {
                      setDraft(replacement);
                      setReplacement(null);
                      composer.current?.focus();
                    }}
                  >
                    Replace draft
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setReplacement(null)}
                  >
                    Keep my draft
                  </button>
                </div>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send('support');
              }}
            >
              <label className="label" htmlFor="support-reply">
                Support reply
              </label>
              <textarea
                ref={composer}
                id="support-reply"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={pending !== null}
                maxLength={10000}
                required
                aria-describedby="reply-hint"
                className="field min-h-[170px] resize-y !leading-7"
                placeholder="Write a thoughtful reply to the customer…"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p id="reply-hint" className="text-[11px] text-muted">
                  Review before sending · {draft.length.toLocaleString()} /
                  10,000
                </p>
                <button
                  className="btn btn-primary"
                  disabled={pending !== null || !draft.trim()}
                  type="submit"
                >
                  {pending === 'support' ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : (
                    <Send size={15} />
                  )}
                  {pending === 'support' ? 'Sending…' : 'Send reply'}
                </button>
              </div>
            </form>
          </section>
          {demoCustomerReplies && (
            <section className="rounded-xl border border-dashed border-[#c9bfdc] bg-[#f5f2fa] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold text-[#67567f]">
                  <FlaskConical size={16} />
                  Demo tools
                </h2>
                <button
                  type="button"
                  onClick={() => setDemoOpen(!demoOpen)}
                  aria-expanded={demoOpen}
                  aria-controls="demo-reply-form"
                  className="btn btn-secondary !py-2"
                >
                  {demoOpen ? 'Close demo form' : 'Add customer reply'}
                </button>
              </div>
              <p className="mt-3 text-xs leading-6 text-[#675f75]">
                Simulates an incoming customer message. This is not a real
                customer portal. Use synthetic information only.
              </p>
              {demoOpen && (
                <form
                  id="demo-reply-form"
                  className="mt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send('customer');
                  }}
                >
                  <label htmlFor="customer-reply" className="label">
                    Simulated customer reply
                  </label>
                  <textarea
                    id="customer-reply"
                    className="field min-h-[110px] resize-y"
                    value={customerDraft}
                    onChange={(e) => setCustomerDraft(e.target.value)}
                    maxLength={10000}
                    required
                    disabled={pending !== null}
                    placeholder="Add the customer's follow-up details…"
                  />
                  <button
                    type="submit"
                    disabled={pending !== null || !customerDraft.trim()}
                    className="btn btn-secondary mt-3"
                  >
                    {pending === 'customer' ? 'Adding…' : 'Add simulated reply'}
                  </button>
                </form>
              )}
            </section>
          )}
          <section className="panel grid gap-6 p-5 sm:grid-cols-2">
            <StatusControl ticket={ticket} onRefresh={refresh} />
            <div className="text-xs leading-6 text-muted">
              <p>Created {date(ticket.createdAt)} UTC</p>
              <p>Last activity {date(ticket.updatedAt)} UTC</p>
            </div>
          </section>
        </div>
        <AnalysisPanel
          id={ticket.id}
          analysis={ticket.analysis}
          autoAnalyze={autoAnalyze}
          onRefresh={refresh}
          onUseReply={insertReply}
          replyBusy={pending !== null}
          suggestionUnavailable={uncertain}
        />
      </div>
    </>
  );
}
