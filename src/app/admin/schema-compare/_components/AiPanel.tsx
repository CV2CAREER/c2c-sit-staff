"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Loader2, RefreshCw, Send, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { schemaDiffErrorMessage, useSchemaDiffAi } from "@/hooks/api/admin/schemaDiff";
import type { AiReview, CompareRequest, CompareResult } from "./types";
import { SeverityPill } from "./ui";
import MarkdownText from "./MarkdownText";

const RISK_STYLES: Record<AiReview["riskLevel"], string> = {
  low: "bg-green-100 text-green-800 ring-green-200",
  medium: "bg-amber-100 text-amber-800 ring-amber-200",
  high: "bg-red-100 text-red-800 ring-red-200",
};

const SUGGESTED_QUESTIONS = [
  "Which differences could cause runtime errors in the app?",
  "What should I fix first, and in what order?",
  "Is it safe to deploy code built against the source to the target?",
  "Which changes could lock large tables or lose data?",
];

const Section = ({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) => {
  if (!items.length) return null;
  const List = ordered ? "ol" : "ul";
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
      <List className={cn("space-y-1 pl-5 text-sm text-gray-800", ordered ? "list-decimal" : "list-disc")}>
        {items.map((x, i) => (
          // the model sometimes numbers its own items — the list already does
          <li key={i}>{x.replace(/^\s*(?:(?:step\s*)?\d+\s*[.):-]|[-*•–])\s*/i, "")}</li>
        ))}
      </List>
    </div>
  );
};

interface QA {
  question: string;
  answer?: string;
  error?: string;
}

interface AiPanelProps {
  result: CompareResult;
  request: CompareRequest;
}

const AiPanel = ({ result, request }: AiPanelProps) => {
  const reviewMutation = useSchemaDiffAi();
  const askMutation = useSchemaDiffAi();
  const [review, setReview] = useState<AiReview | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<QA[]>([]);
  const threadEnd = useRef<HTMLDivElement>(null);

  // A new comparison invalidates everything the AI said about the old one.
  useEffect(() => {
    setReview(null);
    setReviewError(null);
    setThread([]);
  }, [result.comparedAt]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [thread]);

  const generateReview = () => {
    setReviewError(null);
    reviewMutation.mutate(request, {
      onSuccess: (data) => {
        if (data.mode === "review") setReview(data.review);
      },
      onError: (err) => setReviewError(schemaDiffErrorMessage(err)),
    });
  };

  const ask = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || askMutation.isPending) return;
    setQuestion("");
    setThread((t) => [...t, { question: trimmed }]);
    askMutation.mutate(
      { ...request, question: trimmed },
      {
        onSuccess: (data) =>
          setThread((t) =>
            t.map((x, i) => (i === t.length - 1 ? { ...x, answer: data.mode === "answer" ? data.answer : "" } : x)),
          ),
        onError: (err) =>
          setThread((t) =>
            t.map((x, i) => (i === t.length - 1 ? { ...x, error: schemaDiffErrorMessage(err) } : x)),
          ),
      },
    );
  };

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
        Only schema metadata (names, types, DDL) from this comparison is sent to the AI assistant — never any row
        data. AI output can be wrong; treat it as a second opinion, not a substitute for reviewing the differences.
      </div>

      {/* Review */}
      <div className="rounded-md border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Sparkles className="h-4 w-4 text-violet-500" /> AI risk review
          </h3>
          <button
            type="button"
            onClick={generateReview}
            disabled={reviewMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:bg-violet-300"
          >
            {reviewMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : review ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {reviewMutation.isPending ? "Analysing…" : review ? "Regenerate" : "Generate review"}
          </button>
        </div>

        <div className="p-3">
          {reviewMutation.isPending && (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading {result.summary.total} differences and assessing deployment risk — usually 10–40 seconds…
            </div>
          )}
          {!reviewMutation.isPending && reviewError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">{reviewError}</div>
              <button onClick={generateReview} className="shrink-0 font-medium underline">
                Retry
              </button>
            </div>
          )}
          {!reviewMutation.isPending && !reviewError && !review && (
            <p className="py-4 text-sm text-gray-500">
              Get a plain-English explanation of what these differences mean, what probably caused them, and a safe
              order to fix them in.
            </p>
          )}
          {!reviewMutation.isPending && review && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ring-1 ring-inset",
                    RISK_STYLES[review.riskLevel],
                  )}
                >
                  {review.riskLevel} risk
                </span>
                <p className="flex-1 text-base font-semibold text-gray-900">{review.headline}</p>
              </div>
              {review.summary && <p className="text-sm text-gray-700">{review.summary}</p>}

              {review.keyFindings.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Key findings</h4>
                  <ul className="space-y-2">
                    {review.keyFindings.map((f, i) => (
                      <li key={i} className="rounded-md border border-gray-200 p-2.5">
                        <div className="flex items-center gap-2">
                          <SeverityPill severity={f.severity} />
                          <span className="text-sm font-semibold text-gray-900">{f.title}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-700">{f.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Section title="Likely causes" items={review.likelyCauses} />
                <Section title="Suggested deployment plan" items={review.deploymentPlan} ordered />
              </div>

              {review.cautions.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> Cautions
                  </h4>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                    {review.cautions.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Q&A */}
      <div className="rounded-md border border-gray-200">
        <div className="border-b border-gray-100 px-3 py-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Bot className="h-4 w-4 text-violet-500" /> Ask about this comparison
          </h3>
        </div>
        <div className="space-y-3 p-3">
          {thread.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  disabled={askMutation.isPending}
                  className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs text-violet-800 hover:bg-violet-100"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {thread.map((qa, i) => (
            <Fragment key={i}>
              <div className="ml-auto w-fit max-w-[85%] rounded-lg bg-blue px-3 py-2 text-sm text-white">
                {qa.question}
              </div>
              <div className="max-w-[95%] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                {qa.answer !== undefined ? (
                  <MarkdownText text={qa.answer || "(The assistant returned an empty answer.)"} />
                ) : qa.error ? (
                  <div className="flex items-start gap-2 text-sm text-red-700">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="flex-1">{qa.error}</span>
                    <button
                      onClick={() => {
                        setThread((t) => t.filter((_, idx) => idx !== i));
                        ask(qa.question);
                      }}
                      className="shrink-0 font-medium underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                  </span>
                )}
              </div>
            </Fragment>
          ))}
          <div ref={threadEnd} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(question);
                }
              }}
              rows={2}
              maxLength={1000}
              placeholder="e.g. Why would the users table differ? What does the duplicate constraint warning mean?"
              className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            <button
              type="submit"
              disabled={!question.trim() || askMutation.isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-violet-300"
            >
              {askMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AiPanel;
