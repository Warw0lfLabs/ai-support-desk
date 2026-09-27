import Link from 'next/link';
import {
  Inbox,
  CircleDot,
  Clock3,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { TicketListDTO } from '../contracts';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { Filters } from './filters';
const date = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
export function Dashboard({
  data,
  query,
}: {
  data: TicketListDTO;
  query: URLSearchParams;
}) {
  const cards = [
    {
      label: 'Total tickets',
      value: data.stats.total,
      caption: 'Across your workspace',
      icon: Inbox,
      color: '#6f61b4',
      bg: '#f0edf9',
    },
    {
      label: 'Open tickets',
      value: data.stats.open,
      caption: 'Ready for a first response',
      icon: CircleDot,
      color: '#6380bc',
      bg: '#edf2fd',
    },
    {
      label: 'In progress',
      value: data.stats.inProgress,
      caption: 'Getting the attention they need',
      icon: Clock3,
      color: '#b28b45',
      bg: '#fcf5e8',
    },
    {
      label: 'Resolved',
      value: data.stats.resolved,
      caption: 'Another customer helped',
      icon: CheckCircle2,
      color: '#4a9175',
      bg: '#eaf6f0',
    },
  ];
  const pageHref = (page: number) => {
    const p = new URLSearchParams(query);
    p.set('page', String(page));
    return `/tickets?${p}`;
  };
  const filtered = ['q', 'status', 'category', 'priority'].some((key) =>
    query.has(key),
  );
  return (
    <>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.13em] text-[#6a6278]">
            Your support workspace
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-.7px]">
            Ticket overview
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            A clear view of every conversation. A better next step for every
            customer.
          </p>
        </div>
        <Link href="/tickets/new" className="btn btn-primary mt-2">
          <Plus size={17} />
          New ticket
        </Link>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-5">
        {cards.map((card) => (
          <div className="panel p-4 sm:p-5" key={card.label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted">{card.label}</p>
              <span
                className="rounded-lg p-2"
                style={{ color: card.color, background: card.bg }}
              >
                <card.icon size={17} />
              </span>
            </div>
            <p className="mt-1 text-[30px] font-semibold tracking-tight">
              {card.value}
            </p>
            <p className="mt-2 text-[10px] leading-4 text-[#656b74]">
              {card.caption}
            </p>
          </div>
        ))}
      </div>
      <section className="panel overflow-hidden" aria-label="Ticket list">
        <div className="flex items-center justify-between gap-3 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold">All tickets</h2>
            <span className="rounded-md bg-[#f1eff7] px-2 py-0.5 text-[11px] font-medium text-[#726389]">
              {data.totalItems}
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <Sparkles size={13} className="text-[#706689]" />
            AI-assisted triage
          </span>
        </div>
        <Filters />
        {data.items.length === 0 ? (
          <EmptyState filtered={filtered || data.page > 1} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <caption className="sr-only">
                  Support tickets sorted newest first
                </caption>
                <thead className="bg-[#fafbfc] text-[10px] font-semibold uppercase tracking-[.06em] text-[#666b73]">
                  <tr>
                    {[
                      'Ticket',
                      'Status',
                      'Category',
                      'Priority',
                      'Created',
                      '',
                    ].map((h, i) => (
                      <th key={i} scope="col" className="px-5 py-3">
                        {h || <span className="sr-only">Open ticket</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-t border-[#eef0f4] hover:bg-[#fcfbfe]"
                    >
                      <td className="max-w-[340px] px-5 py-4">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="group block"
                        >
                          <span className="mb-1 block font-mono text-[10px] text-[#696571]">
                            #{ticket.id.slice(-8).toUpperCase()}
                          </span>
                          <span className="block truncate text-[13px] font-medium group-hover:text-brand">
                            {ticket.title}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <Badge value={ticket.status} dot />
                      </td>
                      <td className="px-5 py-4">
                        <Badge value={ticket.analysis.category} />
                        {ticket.analysis.isStale && (
                          <span className="block mt-1 text-[10px] text-amber-800">
                            Analysis outdated
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge value={ticket.analysis.priority} dot />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                        {date(ticket.createdAt)}
                      </td>
                      <td className="pr-5 text-[#64666c]">
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-[#eef0f4] md:hidden">
              {data.items.map((ticket) => (
                <article key={ticket.id} className="p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted">
                      #{ticket.id.slice(-8).toUpperCase()}
                    </span>
                    <span className="text-[10px] text-muted">
                      {date(ticket.createdAt)}
                    </span>
                  </div>
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="text-sm font-semibold leading-6 hover:text-brand"
                  >
                    {ticket.title}
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge value={ticket.status} dot />
                    <Badge value={ticket.analysis.category} />
                    {ticket.analysis.isStale && (
                      <span className="block mt-1 text-[10px] text-amber-800">
                        Analysis outdated
                      </span>
                    )}
                    <Badge value={ticket.analysis.priority} dot />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9ebf0] px-5 py-4">
          <p className="text-[11px] text-muted">
            {data.items.length
              ? `Showing ${(data.page - 1) * data.pageSize + 1}–${(data.page - 1) * data.pageSize + data.items.length} of ${data.totalItems} tickets`
              : 'No tickets to display'}
          </p>
          <nav aria-label="Pagination" className="flex items-center gap-3">
            {data.page > 1 ? (
              <Link
                aria-label="Previous page"
                className="btn btn-secondary !p-1.5"
                href={pageHref(data.page - 1)}
              >
                <ChevronLeft size={15} />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="rounded-md border border-[#e5e7ed] p-1.5 text-[#64666b]"
              >
                <ChevronLeft size={15} />
              </span>
            )}
            <span className="text-[11px] text-muted">
              Page {data.page} of {Math.max(1, data.totalPages)}
            </span>
            {data.page < data.totalPages ? (
              <Link
                aria-label="Next page"
                className="btn btn-secondary !p-1.5"
                href={pageHref(data.page + 1)}
              >
                <ChevronRight size={15} />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="rounded-md border border-[#e5e7ed] p-1.5 text-[#64666b]"
              >
                <ChevronRight size={15} />
              </span>
            )}
          </nav>
        </div>
      </section>
      <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-[#696473]">
        <Sparkles size={14} className="mt-0.5 shrink-0" />
        Filters use the last saved AI classification, which may be outdated. AI
        suggests a category, priority, and response. You stay in control of the
        conversation.
      </p>
    </>
  );
}
