"use client";

import { MessageCircleQuestion } from "lucide-react";

/**
 * Gap Log (S.ADM.12.02.IR02A) — every question the chatbot could not answer,
 * each convertible into a draft FAQ. It needs the chatbot to record declines,
 * which the current Support AI service does not do yet, so there is no data
 * source to show.
 */
export function GapLogTab() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 py-12 px-6 text-center">
      <MessageCircleQuestion className="h-8 w-8 text-gray-300" />
      <p className="text-sm font-medium text-gray-700">No gaps recorded yet</p>
      <p className="max-w-md text-sm text-gray-500">
        Questions the chatbot couldn&apos;t answer will appear here, with how often they were
        asked, so you can turn each one into a draft FAQ in the client&apos;s own words.
      </p>
      <p className="max-w-md text-xs text-gray-400">
        This fills in once the chatbot answers from the FAQ and logs the questions it declines.
      </p>
    </div>
  );
}
