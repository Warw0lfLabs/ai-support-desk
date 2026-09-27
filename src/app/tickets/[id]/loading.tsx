export default function Loading() {
  return (
    <div role="status" aria-label="Loading ticket" className="animate-pulse">
      <div className="mb-6 h-8 w-1/2 rounded bg-slate-200" />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="panel h-96" />
        <div className="panel h-96" />
      </div>
    </div>
  );
}
