'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Loader2,
  ArrowDownToLine,
  AlertCircle,
} from 'lucide-react';
import type { AnalysisDTO } from '@/features/tickets/contracts';
import { mutate } from '@/features/tickets/client-api';
import { Badge } from '@/components/badge';
export function AnalysisPanel({
  id,
  analysis,
  autoAnalyze,
  onRefresh,
  onUseReply,
  replyBusy = false,
  suggestionUnavailable = false,
}: {
  id: string;
  analysis: AnalysisDTO;
  autoAnalyze: boolean;
  onRefresh: () => Promise<void>;
  onUseReply: (body: string) => void;
  replyBusy?: boolean;
  suggestionUnavailable?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);
  const run = useCallback(async () => {
    setPending(true);
    setError('');
    try {
      await mutate(`/api/tickets/${id}/analysis`, 'POST', {});
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Analysis failed. Please try again.',
      );
    } finally {
      try {
        await onRefresh();
      } finally {
        setPending(false);
      }
    }
  }, [id, onRefresh]);
  useEffect(() => {
    if (autoAnalyze && analysis.state === 'NOT_STARTED' && !started.current) {
      started.current = true;
      void run();
    }
  }, [autoAnalyze, analysis.state, run]);
  const usable =
    analysis.state === 'SUCCEEDED' &&
    !analysis.isStale &&
    !pending &&
    !replyBusy &&
    !suggestionUnavailable;
  return (
    <section
      aria-labelledby="analysis-heading"
      className="overflow-hidden rounded-xl border border-[#ddd5f0] bg-white"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#e7e0f4] bg-[#f5f2fc] p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-[#e9e1fa] p-2 text-brand">
            <Sparkles size={19} />
          </span>
          <div>
            <h2
              id="analysis-heading"
              className="text-sm font-semibold text-[#51406f]"
            >
              AI Analysis
            </h2>
            <p className="mt-1 text-[11px] text-[#6e6080]">
              An assistant for the support agent
            </p>
          </div>
        </div>
        {analysis.provider === 'mock' && (
          <span className="rounded-md border border-[#dfd4f0] px-2 py-1 text-[10px] font-semibold text-[#715f81]">
            Mock AI
          </span>
        )}
      </div>
      <div className="p-5 sm:p-6">
        <p className="mb-5 text-xs leading-6 text-[#655c74]">
          Analyze conversation → Use reply → Edit draft → Send reply
        </p>
        {analysis.isStale && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
          >
            <strong>Analysis is out of date.</strong> New conversation activity
            is available. Refresh analysis before using a suggested reply.
          </div>
        )}
        {(error || analysis.state === 'FAILED') && (
          <p
            role="alert"
            className="mb-4 flex gap-2 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-800"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error ||
              'Analysis failed. Your conversation and previous result are preserved. Please retry.'}
          </p>
        )}
        {pending && (
          <p
            role="status"
            className="mb-5 flex items-center gap-2 text-xs text-brand"
          >
            <Loader2 size={17} className="animate-spin" />
            Analyzing the conversation…
          </p>
        )}
        {analysis.summary ? (
          <div className="space-y-5">
            <div>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[.1em] text-[#6f6679]">
                Summary
              </h3>
              <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-[#535064]">
                {analysis.summary}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-y border-[#eee9f5] py-4">
              <div>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#6f6679]">
                  Suggested category
                </h3>
                <Badge value={analysis.category} />
              </div>
              <div>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#6f6679]">
                  Suggested priority
                </h3>
                <Badge value={analysis.priority} dot />
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-[#6f6679]">
                Suggested response
              </h3>
              <p className="whitespace-pre-wrap break-words rounded-lg border border-[#eae5f3] bg-[#faf8fe] p-4 text-[13px] leading-7 text-[#655c74]">
                {analysis.suggestedResponse}
              </p>
              <button
                type="button"
                disabled={!usable}
                onClick={() => {
                  if (usable && analysis.suggestedResponse)
                    onUseReply(analysis.suggestedResponse);
                }}
                className="btn btn-primary mt-4 w-full"
              >
                <ArrowDownToLine size={15} />
                Use reply
              </button>
              <p className="mt-2 text-center text-[11px] text-muted">
                Adds an editable draft. Does not send a message.
              </p>
            </div>
            <p className="text-[11px] text-muted">
              Based on conversation revision{' '}
              {analysis.analyzedConversationVersion ?? 'unknown'}.
              {analysis.omittedMessageCount > 0 &&
                ` ${analysis.omittedMessageCount} older messages omitted to keep context bounded.`}
            </p>
          </div>
        ) : (
          !pending && (
            <p className="mb-5 text-sm leading-6 text-muted">
              Analyze this conversation for a summary, recommended priority, and
              a response draft.
            </p>
          )
        )}
        <button
          type="button"
          disabled={pending || replyBusy}
          onClick={() => void run()}
          className="btn btn-secondary mt-5 w-full"
        >
          <RefreshCw size={14} />
          {analysis.summary
            ? 'Refresh analysis'
            : analysis.state === 'FAILED' || analysis.state === 'PROCESSING'
              ? 'Retry analysis'
              : 'Analyze conversation'}
        </button>
        {analysis.state === 'PROCESSING' && !pending && (
          <p className="mt-3 text-xs leading-5 text-muted">
            A previous request may still be running. Refresh the conversation to
            check, or retry if it was interrupted.
          </p>
        )}
      </div>
      <div className="border-t border-[#ece6f4] bg-[#fcfbfe] px-5 py-4 text-[11px] leading-5 text-[#706678]">
        AI can make mistakes. Review and edit its suggestions. Only your
        explicit Send reply action adds a support message.
      </div>
    </section>
  );
}
