import Link from 'next/link';
import { SearchX } from 'lucide-react';
export default function NotFound() {
  return (
    <div className="panel mx-auto max-w-lg p-12 text-center">
      <SearchX size={32} className="mx-auto mb-5 text-brand" />
      <h1 className="text-xl font-semibold">Ticket not found</h1>
      <p className="mt-3 text-muted">
        This ticket doesn’t exist. Head back to your workspace to find another.
      </p>
      <Link className="btn btn-primary mt-6" href="/tickets">
        Back to tickets
      </Link>
    </div>
  );
}
