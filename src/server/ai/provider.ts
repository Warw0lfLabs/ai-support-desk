import type { AnalysisResult } from '@/features/analysis/schemas';
import type { MessageRole } from '@/features/tickets/contracts';
export interface ConversationInput {
  title: string;
  messages: { authorRole: MessageRole; body: string }[];
  omittedMessageCount: number;
}
export interface AIProvider {
  readonly name: string;
  readonly model: string;
  analyze(
    input: ConversationInput,
    signal: AbortSignal,
  ): Promise<AnalysisResult>;
}
