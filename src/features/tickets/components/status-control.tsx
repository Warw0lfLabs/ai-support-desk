'use client';
import { useState } from 'react';
import type { TicketDTO } from '../contracts';
import { labels, statusTransitions } from '../status-rules';
import { mutate } from '../client-api';
export function StatusControl({
  ticket,
  onRefresh,
}: {
  ticket: TicketDTO;
  onRefresh: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function change(status: string) {
    setPending(true);
    setError('');
    try {
      await mutate(`/api/tickets/${ticket.id}`, 'PATCH', {
        status,
        version: ticket.version,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update status.');
    } finally {
      await onRefresh();
      setPending(false);
    }
  }
  return (
    <div>
      <label htmlFor="ticket-status" className="label">
        Ticket status
      </label>
      <select
        className="field !text-xs"
        id="ticket-status"
        disabled={pending}
        value={ticket.status}
        onChange={(e) => void change(e.target.value)}
      >
        {[ticket.status, ...statusTransitions[ticket.status]].map((s) => (
          <option value={s} key={s}>
            {labels[s]}
          </option>
        ))}
      </select>
      <p role="status" className="mt-2 text-[11px] text-muted">
        {pending ? 'Saving status…' : 'Changes are saved automatically.'}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
