import type { categories, priorities, statuses } from './schemas';
export type TicketStatus = (typeof statuses)[number];
export type Category = (typeof categories)[number];
export type Priority = (typeof priorities)[number];
export type AnalysisState =
  'NOT_STARTED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
export interface AnalysisDTO {
  state: AnalysisState;
  summary: string | null;
  category: Category | null;
  priority: Priority | null;
  suggestedResponse: string | null;
  provider: string | null;
  analyzedConversationVersion: number | null;
  omittedMessageCount: number;
  isStale: boolean;
  lastErrorCode: string | null;
  updatedAt: string;
}
export interface TicketSummaryDTO {
  id: string;
  title: string;
  status: TicketStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  analysis: {
    state: AnalysisState;
    category: Category | null;
    priority: Priority | null;
    isStale: boolean;
  };
}
export interface TicketDTO extends Omit<TicketSummaryDTO, 'analysis'> {
  conversationVersion: number;
  messages: MessageDTO[];
  nextBeforeSequence: number | null;
  analysis: AnalysisDTO;
}
export interface TicketListDTO {
  items: TicketSummaryDTO[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  stats: { total: number; open: number; inProgress: number; resolved: number };
}
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    fieldErrors?: Record<string, string[]>;
  };
}

export type MessageRole = 'CUSTOMER' | 'SUPPORT';
export interface MessageDTO {
  id: string;
  sequence: number;
  authorRole: MessageRole;
  body: string;
  createdAt: string;
}
export interface MessagePageDTO {
  items: MessageDTO[];
  nextBeforeSequence: number | null;
  conversationVersion: number;
}
