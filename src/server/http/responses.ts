import 'server-only';
import { z } from 'zod';
import { AppError } from './errors';
import { logEvent } from '../logging/logger';
export async function handle(
  operation: string,
  action: () => Promise<unknown>,
  status = 200,
) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'X-Request-ID': requestId,
  };
  try {
    const result = await action();
    logEvent({
      requestId,
      operation,
      code: 'OK',
      durationMs: Date.now() - start,
    });
    return Response.json(result, { status, headers });
  } catch (error) {
    const known = error instanceof AppError;
    const validation = error instanceof z.ZodError;
    const code = known
      ? error.code
      : validation
        ? 'VALIDATION_ERROR'
        : 'INTERNAL_ERROR';
    const httpStatus = known ? error.status : validation ? 422 : 500;
    logEvent(
      { requestId, operation, code, durationMs: Date.now() - start },
      httpStatus >= 500 ? 'error' : 'info',
    );
    if (httpStatus === 429) headers['Retry-After'] = '60';
    return Response.json(
      {
        error: {
          code,
          message: known
            ? error.message
            : validation
              ? 'Check the submitted fields.'
              : 'Something went wrong. Please try again.',
          requestId,
          ...(validation
            ? { fieldErrors: z.flattenError(error).fieldErrors }
            : {}),
        },
      },
      { status: httpStatus, headers },
    );
  }
}
