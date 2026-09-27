import 'server-only';
type Event = {
  requestId: string;
  operation: string;
  code: string;
  durationMs?: number;
};
export function logEvent(event: Event, level: 'info' | 'error' = 'info') {
  if (
    process.env.LOG_LEVEL === 'silent' ||
    (process.env.LOG_LEVEL === 'error' && level === 'info')
  )
    return;
  // Deliberate allowlist: never accept Error objects, request bodies, URLs or provider payloads.
  console[level](
    JSON.stringify({
      level,
      requestId: event.requestId,
      operation: event.operation,
      code: event.code,
      durationMs: event.durationMs,
    }),
  );
}
