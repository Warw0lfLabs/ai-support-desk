import 'server-only';
import { getEnv } from '../config/env';
import { MockAIProvider } from './mock-provider';
import { OpenAICompatibleProvider } from './openai-compatible-provider';
import type { AIProvider } from './provider';
export function getAIProvider(): AIProvider {
  const env = getEnv();
  return env.AI_PROVIDER === 'mock'
    ? new MockAIProvider()
    : new OpenAICompatibleProvider(
        env.AI_MODEL!,
        env.AI_BASE_URL,
        env.AI_API_KEY!,
      );
}
