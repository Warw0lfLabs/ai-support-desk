import { Dashboard } from '@/features/tickets/components/dashboard';
import { listTickets } from '@/server/services/ticket-service';
import { listTicketsSchema } from '@/features/tickets/schemas';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = listTicketsSchema.safeParse(raw);
  if (!parsed.success)
    return (
      <div className="panel p-8">
        <h1 className="text-xl font-semibold">These filters aren’t valid</h1>
        <p className="my-3 text-muted">
          Reset your search to return to the ticket list.
        </p>
        <Link className="btn btn-primary" href="/tickets">
          Reset filters
        </Link>
      </div>
    );
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(raw))
    if (typeof v === 'string') query.set(k, v);
  return <Dashboard data={await listTickets(parsed.data)} query={query} />;
}
