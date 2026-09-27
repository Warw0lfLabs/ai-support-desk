import 'server-only';
import { z } from 'zod';
const schema = z
  .object({
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
      ),
    APP_ORIGIN: z.string().url().default('http://localhost:3000'),
    DEMO_CUSTOMER_REPLIES: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    AI_PROVIDER: z.enum(['mock', 'openai-compatible']).default('mock'),
    AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
    AI_API_KEY: z.string().optional(),
    AI_MODEL: z.string().max(160).optional(),
    AI_TIMEOUT_MS: z.coerce.number().int().min(100).max(20000).default(20000),
    LOG_LEVEL: z.enum(['info', 'error', 'silent']).default('info'),
  })
  .superRefine((env, ctx) => {
    if (
      env.AI_PROVIDER === 'openai-compatible' &&
      (!env.AI_API_KEY || !env.AI_MODEL)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Real AI requires AI_API_KEY and AI_MODEL.',
      });
    if (
      env.AI_PROVIDER === 'openai-compatible' &&
      !env.AI_BASE_URL.startsWith('https://')
    )
      ctx.addIssue({ code: 'custom', message: 'Real AI requires HTTPS.' });
  });
let cached: z.infer<typeof schema> | undefined;
export function getEnv() {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success)
      throw new Error(
        'Invalid server configuration. Check documented environment variables.',
      );
    cached = parsed.data;
  }
  return cached;
}
