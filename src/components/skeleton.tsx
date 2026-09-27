export function DashboardSkeleton() {
  return (
    <div aria-label="Loading tickets" role="status" className="animate-pulse">
      <span className="sr-only">Loading tickets…</span>
      <div className="mb-3 h-8 w-52 rounded bg-slate-200" />
      <div className="mb-8 h-4 w-72 max-w-full rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="panel h-28" />
        ))}
      </div>
      <div className="panel mt-8 p-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="my-6 h-10 rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
