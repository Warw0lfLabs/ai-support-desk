import Link from 'next/link';
import { Inbox, SearchX, Plus } from 'lucide-react';
export function EmptyState({ filtered = false }: { filtered?: boolean }) {
  const Icon = filtered ? SearchX : Inbox;
  return (
    <div className="flex flex-col items-center px-5 py-20 text-center">
      <span className="mb-4 rounded-2xl bg-[#f2effa] p-4 text-brand">
        <Icon size={28} />
      </span>
      <h2 className="text-lg font-semibold">
        {filtered
          ? 'No matching tickets'
          : 'A fresh start for your support desk'}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
        {filtered
          ? 'Try a different search or clear your filters to see more tickets.'
          : 'Create your first ticket and let AI help you find the next step.'}
      </p>
      <Link
        href={filtered ? '/tickets' : '/tickets/new'}
        className="btn btn-secondary mt-6"
      >
        {!filtered && <Plus size={16} />}
        {filtered ? 'Clear filters' : 'Create a ticket'}
      </Link>
    </div>
  );
}
