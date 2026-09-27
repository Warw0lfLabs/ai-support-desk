'use client';
import { AlertCircle, RefreshCw } from 'lucide-react';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="panel mx-auto max-w-lg p-10 text-center">
      <AlertCircle className="mx-auto mb-4 text-brand" size={32} />
      <h1 className="text-xl font-semibold">We couldn’t load your workspace</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        The service may be temporarily unavailable. Your saved tickets are still
        in the database. Please try again.
      </p>
      <button onClick={reset} className="btn btn-primary mt-6">
        <RefreshCw size={15} />
        Try again
      </button>
    </div>
  );
}
