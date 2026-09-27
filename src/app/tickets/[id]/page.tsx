import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { TicketWorkspace } from '@/features/tickets/components/ticket-workspace';
import { getEnv } from '@/server/config/env';
import { getTicket } from '@/server/services/ticket-service';
import { AppError } from '@/server/http/errors';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ticket details' };
export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ analyze?: string }>;
}) {
  const { id } = await params;
  let ticket;
  try {
    ticket = await getTicket(id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
  const query = await searchParams;
  return (
    <>
      <Link
        href="/tickets"
        className="mb-6 inline-flex items-center gap-2 text-xs text-muted hover:text-brand"
      >
        <ArrowLeft size={14} />
        Back to tickets
      </Link>
      <TicketWorkspace
        key={ticket.id}
        initialTicket={ticket}
        demoCustomerReplies={getEnv().DEMO_CUSTOMER_REPLIES}
        autoAnalyze={query.analyze === '1'}
      />
    </>
  );
}
