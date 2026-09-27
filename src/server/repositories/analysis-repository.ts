import 'server-only';
import type { AnalysisResult } from '@/features/analysis/schemas';
import { getDb } from '../db/prisma';
import { databaseError } from '../db/errors';
import { assertDemoScope, type AccessContext } from '../access/access-context';
export const analysisRepository = {
  async start(context: AccessContext, ticketId: string) {
    assertDemoScope(context);
    await getDb()
      .ticketAnalysis.update({
        where: { ticketId },
        data: { state: 'PROCESSING', lastErrorCode: null },
      })
      .catch(databaseError);
  },
  async succeed(
    context: AccessContext,
    ticketId: string,
    result: AnalysisResult,
    provider: string,
    model: string,
    conversationVersion: number,
    omittedMessageCount: number,
  ) {
    assertDemoScope(context);
    await getDb()
      .ticketAnalysis.update({
        where: { ticketId },
        data: {
          state: 'SUCCEEDED',
          analyzedConversationVersion: conversationVersion,
          omittedMessageCount,
          summary: result.summary,
          category: result.category,
          priority: result.priority,
          suggestedResponse: result.suggestedResponse,
          provider,
          model,
          lastErrorCode: null,
        },
      })
      .catch(databaseError);
  },
  async fail(context: AccessContext, ticketId: string, code: string) {
    assertDemoScope(context);
    await getDb()
      .ticketAnalysis.update({
        where: { ticketId },
        data: { state: 'FAILED', lastErrorCode: code },
      })
      .catch(databaseError);
  },
};
