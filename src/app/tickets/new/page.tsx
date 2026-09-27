import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { TicketForm } from '@/features/tickets/components/ticket-form';
export const metadata = { title: 'New ticket' };
export default function NewTicket() {
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/tickets"
        className="mb-6 inline-flex items-center gap-2 text-xs text-muted hover:text-brand"
      >
        <ArrowLeft size={14} />
        Back to tickets
      </Link>
      <h1 className="text-[28px] font-semibold tracking-tight">
        Create a ticket
      </h1>
      <p className="mt-2 mb-8 text-sm text-muted">
        Let’s get the details down. We’ll help with the next step.
      </p>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
        <section className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#e9ebf0] px-6 py-5 sm:px-8">
            <FileText size={17} className="text-brand" />
            <h2 className="font-semibold">Ticket details</h2>
          </div>
          <TicketForm />
        </section>
        <aside className="space-y-5">
          <div className="rounded-xl border border-[#e4dcf4] bg-[#f1edf9] p-6">
            <Sparkles size={24} className="mb-4 text-brand" />
            <h2 className="font-semibold">A head start, powered by AI</h2>
            <p className="mt-3 text-xs leading-6 text-[#6d657e]">
              After you create a ticket, we’ll suggest:
            </p>
            <ul className="mt-3 space-y-3 text-xs text-[#655b78]">
              {[
                'A concise issue summary',
                'A category and priority',
                'A thoughtful response draft',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check size={14} className="text-brand" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-[#dfd6ef] pt-4 text-[11px] leading-5 text-[#6d6179]">
              Your ticket is saved first. You can always retry analysis later.
            </p>
          </div>
          <div className="flex gap-3 px-2 text-[11px] leading-5 text-muted">
            <ShieldCheck size={19} className="shrink-0 text-[#646972]" />
            <p>
              This is a shared portfolio demo. Please use synthetic information
              only.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
