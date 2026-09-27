import { z } from 'zod';
import { AppError } from './errors';
export const MAX_BODY_BYTES = 64 * 1024;
export async function readJson(request: Request): Promise<unknown> {
  if (
    request.headers.get('content-type')?.split(';')[0]?.trim() !==
    'application/json'
  )
    throw new AppError('UNSUPPORTED_MEDIA_TYPE', 415, 'Use application/json.');
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) > MAX_BODY_BYTES)
    throw new AppError('BODY_TOO_LARGE', 413, 'Request body is too large.');
  if (!request.body)
    throw new AppError('MALFORMED_JSON', 400, 'A JSON body is required.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new AppError('BODY_TOO_LARGE', 413, 'Request body is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new AppError(
      'MALFORMED_JSON',
      400,
      'The request must contain valid JSON.',
    );
  }
}
export function parseQuery<T>(
  params: URLSearchParams,
  schema: z.ZodType<T>,
): T {
  const values: Record<string, string> = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(values, key))
      throw new AppError(
        'INVALID_QUERY',
        400,
        'Repeated query parameters are not supported.',
      );
    Object.defineProperty(values, key, {
      value,
      enumerable: true,
      configurable: true,
    });
  }
  const parsed = schema.safeParse(values);
  if (!parsed.success)
    throw new AppError(
      'INVALID_QUERY',
      400,
      'Invalid search or filter parameters.',
    );
  return parsed.data;
}
