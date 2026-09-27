import 'server-only';
import { getEnv } from '../config/env';
import { AppError } from './errors';
const buckets = new Map<string, { count: number; resetAt: number }>();
export function protectMutation(request: Request, kind: 'ticket' | 'analysis') {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (
    (origin && origin !== new URL(getEnv().APP_ORIGIN).origin) ||
    fetchSite === 'cross-site'
  )
    throw new AppError(
      'FORBIDDEN_ORIGIN',
      403,
      'This origin cannot modify tickets.',
    );
  // Global per-process budgets: do not trust spoofable forwarded IP headers.
  const now = Date.now();
  let bucket = buckets.get(kind);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 60000 };
    buckets.set(kind, bucket);
  }
  if (++bucket.count > (kind === 'analysis' ? 20 : 120))
    throw new AppError(
      'RATE_LIMITED',
      429,
      'Too many requests. Please try again in a minute.',
    );
}
