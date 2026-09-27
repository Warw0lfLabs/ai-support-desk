import type { ApiErrorBody } from './contracts';
export async function mutate<T>(
  url: string,
  method: string,
  body: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'Connection interrupted. Please check your connection and try again.',
    );
  }
  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const data = (await response.json()) as ApiErrorBody;
      message = data.error?.message ?? message;
    } catch {
      /* A proxy may return a non-JSON error. */
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
