import Link from 'next/link';
import {
  Headphones,
  Inbox,
  Sparkles,
  ArrowUpRight,
  Layers3,
  ChevronDown,
  CircleHelp,
} from 'lucide-react';
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-4"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-[224px] flex-col bg-[#202332] text-white lg:flex">
        <Link
          href="/tickets"
          className="flex items-center gap-3 px-6 py-8 font-semibold tracking-tight"
        >
          <span className="rounded-xl bg-[#8270da] p-2">
            <Headphones size={21} />
          </span>
          <span className="text-[17px]">Support Desk</span>
        </Link>
        <div className="mx-4 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#42465b] text-xs font-bold">
            AC
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold">Acme workspace</p>
            <p className="mt-1 text-[11px] text-[#a8adbf]">Demo environment</p>
          </div>
          <ChevronDown size={14} className="text-[#a8adbf]" />
        </div>
        <div className="px-6 pb-3 pt-9 text-[10px] font-semibold tracking-[.14em] text-[#9a9fb3]">
          WORKSPACE
        </div>
        <nav aria-label="Main navigation" className="px-3">
          <Link
            href="/tickets"
            className="flex items-center gap-3 rounded-lg bg-[#39344f] px-4 py-3 text-[13px] font-medium text-[#d6ccff]"
          >
            <Inbox size={18} />
            Support tickets
          </Link>
        </nav>
        <div className="mx-5 mt-auto mb-6 rounded-xl border border-[#62577f] bg-[#2c2a40] p-4">
          <Sparkles size={19} className="mb-3 text-[#c4b5ff]" />
          <p className="text-xs font-semibold">A little help from AI</p>
          <p className="mt-2 text-[11px] leading-relaxed text-[#b8b3cc]">
            Less time sorting tickets.
            <br />
            More time helping people.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-[#cbc1ec]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a99ade]" />
            Human-reviewed suggestions
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#515065] text-xs">
            DA
          </span>
          <div>
            <p className="text-xs font-medium">Demo agent</p>
            <p className="mt-1 text-[10px] text-[#a8adbf]">
              Shared demo workspace
            </p>
          </div>
        </div>
      </aside>
      <div className="lg:ml-[224px]">
        <header className="flex h-[72px] items-center justify-between border-b border-[#e5e7ed] bg-white px-5 sm:px-8 xl:px-10">
          <div className="flex items-center gap-2 text-[13px]">
            <Headphones size={19} className="text-brand lg:hidden" />
            <span className="hidden text-muted sm:inline">Workspace</span>
            <span className="hidden px-2 text-[#c1c5cf] sm:inline">/</span>
            <span className="font-medium">Support tickets</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-[#e4e0f1] bg-[#f7f5fc] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#75649b]">
              SYNTHETIC DATA ONLY
            </span>
            <CircleHelp
              size={18}
              className="hidden text-[#858b98] sm:block"
              aria-hidden="true"
            />
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ded8ed] bg-[#eee9f7] text-[11px] font-semibold text-[#746089]">
              DA
            </span>
          </div>
        </header>
        <main
          id="main"
          className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 xl:px-10"
        >
          {children}
        </main>
        <footer className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e7ed] py-5 text-[11px] text-muted sm:mx-8 xl:mx-10">
          <span className="flex items-center gap-1.5">
            <Layers3 size={13} />
            AI Support Desk · Built for better support
          </span>
          <Link
            href="/tickets/new"
            className="flex items-center gap-1 hover:text-brand"
          >
            Create a ticket
            <ArrowUpRight size={12} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
