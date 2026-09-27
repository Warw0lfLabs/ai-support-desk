'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { createTicketSchema } from '../schemas';
import type { TicketDTO } from '../contracts';
import { mutate } from '../client-api';
export function TicketForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [description, setDescription] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const parsed = createTicketSchema.safeParse({
      title: form.get('title'),
      description: form.get('description'),
    });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      return;
    }
    setPending(true);
    setError('');
    setErrors({});
    try {
      const ticket = await mutate<TicketDTO>(
        '/api/tickets',
        'POST',
        parsed.data,
      );
      router.push(`/tickets/${ticket.id}?analyze=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create ticket.');
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-7 p-6 sm:p-8">
        <div>
          <label className="label" htmlFor="title">
            Ticket title{' '}
            <span aria-hidden="true" className="text-brand">
              *
            </span>
          </label>
          <input
            className="field"
            id="title"
            name="title"
            required
            maxLength={160}
            placeholder="A short, clear description of the issue"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'title-error' : 'title-hint'}
          />
          <p id="title-hint" className="mt-2 text-xs text-muted">
            Keep it specific, so it’s easy to find later.
          </p>
          {errors.title && (
            <p
              role="alert"
              id="title-error"
              className="mt-2 text-xs text-red-700"
            >
              {errors.title}
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="description">
            Description{' '}
            <span aria-hidden="true" className="text-brand">
              *
            </span>
          </label>
          <textarea
            className="field min-h-[220px] resize-y !leading-7"
            id="description"
            name="description"
            required
            maxLength={10000}
            placeholder="What happened? What did you expect? Include any useful details or steps to reproduce the issue."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? 'description-error' : 'description-hint'
            }
          />
          <div className="mt-2 flex justify-between gap-3 text-[11px] text-muted">
            <p id="description-hint">
              Use synthetic details. Never include passwords or personal
              information.
            </p>
            <span className="whitespace-nowrap">
              {description.length.toLocaleString()} / 10,000
            </span>
          </div>
          {errors.description && (
            <p
              role="alert"
              id="description-error"
              className="mt-2 text-xs text-red-700"
            >
              {errors.description}
            </p>
          )}
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-[#e9ebf0] px-6 py-5 sm:px-8">
        <Link href="/tickets" className="btn btn-secondary">
          Cancel
        </Link>
        <button className="btn btn-primary" disabled={pending} type="submit">
          {pending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating ticket…
            </>
          ) : (
            <>
              Create ticket
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
