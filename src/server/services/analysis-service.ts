import 'server-only';
import { analysisSchema } from '@/features/analysis/schemas';
import { messageRepository } from '../repositories/message-repository';
import { selectConversationContext } from '../ai/conversation-context';
import { getTicket } from './ticket-service';
import { getAIProvider } from '../ai/provider-factory';
import { analysisRepository } from '../repositories/analysis-repository';
import { getAccessContext } from '../access/access-context';
import { AppError } from '../http/errors';
import { getEnv } from '../config/env';
const shared = globalThis as unknown as { activeAnalyses?: Set<string> };
const active = (shared.activeAnalyses ??= new Set<string>());
export async function analyzeTicket(id: string) {
  if (active.has(id))
    throw new AppError(
      'ANALYSIS_IN_PROGRESS',
      409,
      'Analysis is already running. Refresh shortly to see the result.',
    );
  active.add(id);
  const context = getAccessContext();
  try {
    const ticket = await getTicket(id);
    if (ticket.analysis.state === 'SUCCEEDED' && !ticket.analysis.isStale)
      return ticket;
    const snapshot = await messageRepository.snapshot(context, id);
    const input = selectConversationContext(
      snapshot.title,
      snapshot.messages,
      snapshot.conversationVersion,
    );
    const provider = getAIProvider();
    await analysisRepository.start(context, id);
    try {
      const signal = AbortSignal.timeout(getEnv().AI_TIMEOUT_MS);
      const result = analysisSchema.parse(
        await provider.analyze(input, signal),
      );
      await analysisRepository.succeed(
        context,
        id,
        result,
        provider.name,
        provider.model,
        snapshot.conversationVersion,
        input.omittedMessageCount,
      );
    } catch (error) {
      const safe =
        error instanceof AppError
          ? error
          : new AppError(
              'AI_FAILED',
              503,
              'Analysis could not be completed. Please try again.',
            );
      await analysisRepository.fail(context, id, safe.code);
      throw safe;
    }
    return getTicket(id);
  } finally {
    active.delete(id);
  }
}
