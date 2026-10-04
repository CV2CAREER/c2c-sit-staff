"use client";

import { FaEdit } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import type { FaqArticle } from "@/types/faq.types";
import { BotBadge, StatusBadge, formatDate } from "./FaqBadges";

interface ReviewQueueTabProps {
  articles: FaqArticle[];
  /** Only admins approve or send back; assistants write and submit. */
  canApprove: boolean;
  isBusy: boolean;
  onEdit: (article: FaqArticle) => void;
  onSubmit: (article: FaqArticle) => void;
  onApprove: (article: FaqArticle) => void;
  onReturn: (article: FaqArticle) => void;
  onDelete: (article: FaqArticle) => void;
}

export function ReviewQueueTab({
  articles,
  canApprove,
  isBusy,
  onEdit,
  onSubmit,
  onApprove,
  onReturn,
  onDelete,
}: ReviewQueueTabProps) {
  return (
    <div className="flex flex-col gap-3">
      {articles.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">
          Nothing waiting. Everything is published.
        </div>
      ) : (
        <div className="grid gap-3">
          {articles.map((article) => (
            <article
              key={article.id}
              className="rounded-lg border border-gray-200 p-4 shadow-sm transition-colors hover:bg-gray-50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={article.status} />
                <BotBadge botAnswerable={article.botAnswerable} />
                <h4 className="font-medium text-gray-900 break-words">{article.question}</h4>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{article.answer}</p>
              <p className="mt-2 text-xs text-gray-400">
                {article.code} &middot; {article.categoryName ?? "—"} &middot; {article.updatedBy},{" "}
                {formatDate(article.updatedAt)}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {article.status === "in_review" ? (
                  canApprove ? (
                    <>
                      <Button size="sm" disabled={isBusy} onClick={() => onApprove(article)}>
                        Approve &amp; publish
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => onReturn(article)}
                      >
                        Send back to draft
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-amber-700">Waiting for an admin to approve.</p>
                  )
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => onEdit(article)}>
                      <FaEdit /> Edit
                    </Button>
                    <Button size="sm" disabled={isBusy} onClick={() => onSubmit(article)}>
                      Send for review
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      disabled={isBusy}
                      onClick={() => onDelete(article)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Nothing reaches a client — or the chatbot — without passing through here. Once the chatbot
        reads the FAQ, an unreviewed answer would be recited to every client who asks.
      </div>
    </div>
  );
}
