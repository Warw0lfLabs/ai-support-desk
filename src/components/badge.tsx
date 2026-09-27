import { labels } from '@/features/tickets/status-rules';
const styles: Record<string, string> = {
  OPEN: 'bg-[#eef2ff] text-[#5363a7]',
  IN_PROGRESS: 'bg-[#fff4df] text-[#896017]',
  RESOLVED: 'bg-[#eaf7f0] text-[#2e7254]',
  LOW: 'bg-[#f1f3f6] text-[#636b79]',
  MEDIUM: 'bg-[#fff6e8] text-[#856526]',
  HIGH: 'bg-[#fff0e8] text-[#995530]',
  URGENT: 'bg-[#fff0f1] text-[#af4354]',
};
export function Badge({
  value,
  dot = false,
}: {
  value: string | null;
  dot?: boolean;
}) {
  if (!value) return <span className="text-xs text-[#666b74]">Unassigned</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium ${styles[value] ?? 'bg-[#f3f2f7] text-[#6c6380]'}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {labels[value] ?? value}
    </span>
  );
}
