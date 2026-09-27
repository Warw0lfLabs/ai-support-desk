'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { statuses, categories, priorities } from '../schemas';
import { labels } from '../status-rules';
export function Filters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [lastUrlQuery, setLastUrlQuery] = useState(params.get('q') ?? '');
  const urlQuery = params.get('q') ?? '';
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setQuery(urlQuery);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function update(key: string, value: string) {
    if (timer.current) clearTimeout(timer.current);
    const next = new URLSearchParams(params);
    // Keep a recently typed search when a filter is changed before debounce completes.
    if (query.trim()) next.set('q', query.trim());
    else next.delete('q');
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    startTransition(() =>
      router.replace(`/tickets?${next.toString()}`, { scroll: false }),
    );
  }
  return (
    <div className="flex flex-col gap-3 border-b border-[#e9ebf0] p-5 xl:flex-row xl:items-center">
      <div className="relative flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-3 text-[#666b73]"
        />
        <label htmlFor="ticket-search" className="sr-only">
          Search tickets
        </label>
        <input
          id="ticket-search"
          type="search"
          maxLength={200}
          placeholder="Search titles and conversation messages…"
          className="field !pl-10 !text-[13px]"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => update('q', value), 350);
          }}
        />
      </div>
      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
        <SlidersHorizontal
          size={15}
          className="mr-1 hidden text-[#626771] sm:block"
        />
        {(
          [
            ['status', 'All statuses', statuses],
            ['category', 'All categories', categories],
            ['priority', 'All priorities', priorities],
          ] as const
        ).map(([key, label, values]) => (
          <div key={key} className="min-w-0 sm:flex-none">
            <label htmlFor={key} className="sr-only">
              {key.charAt(0).toUpperCase() + key.slice(1)} filter
            </label>
            <select
              id={key}
              disabled={pending}
              value={params.get(key) ?? ''}
              onChange={(e) => update(key, e.target.value)}
              className="field !py-2.5 !text-xs"
            >
              <option value="">{label}</option>
              {values.map((v) => (
                <option key={v} value={v}>
                  {labels[v]}
                </option>
              ))}
            </select>
          </div>
        ))}
        {params.toString() && (
          <button
            aria-label="Clear filters"
            className="rounded-md p-2 text-muted hover:bg-slate-100"
            onClick={() => {
              if (timer.current) clearTimeout(timer.current);
              setQuery('');
              startTransition(() => router.replace('/tickets'));
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <span className="sr-only" role="status">
        {pending ? 'Updating tickets…' : ''}
      </span>
    </div>
  );
}
