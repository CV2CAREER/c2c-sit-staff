"use client";

import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FaqGap } from "@/types/faq.types";

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "today";
  if (date.toDateString() === yesterday.toDateString()) return "yesterday";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const SOURCE_STYLES = {
  client: "bg-sky-50 text-sky-700",
  admin: "bg-violet-50 text-violet-700",
  pc: "bg-teal-50 text-teal-700",
} as const;

function SourceChips({ gap }: { gap: FaqGap }) {
  const chips = [
    { key: "client" as const, label: "Client chatbot", count: gap.clientCount },
    { key: "admin" as const, label: "Admin VA", count: gap.adminCount },
    { key: "pc" as const, label: "PC VA", count: gap.pcCount },
  ].filter((c) => c.count > 0);

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c.key}
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_STYLES[c.key]}`}
        >
          {c.label} · {c.count}
        </span>
      ))}
    </div>
  );
}

interface GapLogTabProps {
  gaps: FaqGap[];
  isLoading: boolean;
  isBusy: boolean;
  onWriteAnswer: (gap: FaqGap) => void;
  onDismiss: (gap: FaqGap) => void;
}

/**
 * Gap Log (S.ADM.12.02.IR02A) — every question the client chatbot or the
 * admin/PC VA could not answer, most-asked first. "Write the answer" opens a
 * draft FAQ with the question carried across verbatim.
 */
export function GapLogTab({ gaps, isLoading, isBusy, onWriteAnswer, onDismiss }: GapLogTabProps) {
  if (isLoading) {
    return <div className="p-3 text-sm text-gray-500">Loading the Gap Log...</div>;
  }

  if (!gaps.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 py-12 px-6 text-center">
        <MessageCircleQuestion className="h-8 w-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-700">No gaps recorded yet</p>
        <p className="max-w-md text-sm text-gray-500">
          Questions the client chatbot or the admin/PC Virtual Assistant couldn&apos;t answer will
          appear here, with how often they were asked, so you can turn each one into a draft FAQ.
        </p>
      </div>
    );
  }

  const total = gaps.reduce((sum, gap) => sum + gap.askCount, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">
        Every question a bot could not answer — from the client chatbot and the admin/PC Virtual
        Assistant. <span className="font-semibold text-gray-700">{total} asked.</span>
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-[52%] px-3 py-2 font-semibold">Question asked</th>
              <th className="px-3 py-2 font-semibold">Times</th>
              <th className="px-3 py-2 font-semibold">Last</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {gaps.map((gap) => (
              <tr key={gap.id} className="border-t border-gray-100 align-top">
                <td className="px-3 py-2.5">
                  <p className="font-semibold text-gray-900">{gap.question}</p>
                  <SourceChips gap={gap} />
                </td>
                <td className="px-3 py-2.5">
                  <span className={`font-bold ${gap.askCount >= 10 ? "text-red-700" : "text-gray-600"}`}>
                    {gap.askCount}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{formatWhen(gap.lastAskedAt)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={() => onWriteAnswer(gap)} disabled={isBusy}>
                      Write the answer →
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDismiss(gap)} disabled={isBusy}>
                      Dismiss
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
