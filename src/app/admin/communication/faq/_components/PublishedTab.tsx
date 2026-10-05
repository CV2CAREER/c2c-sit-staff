"use client";

import { FaEdit } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import type { FaqArticle } from "@/types/faq.types";
import { BotBadge, formatDate } from "./FaqBadges";

interface PublishedTabProps {
  articles: FaqArticle[];
  onEdit: (article: FaqArticle) => void;
}

export function PublishedTab({ articles, onEdit }: PublishedTabProps) {
  return (
    <div className="flex flex-col gap-3">
      {articles.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">
          Nothing published yet. New FAQs go through the Review Queue before they appear here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 w-[42%]">Question</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Bot</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="border-t border-gray-100 align-top hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 break-words">{article.question}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-400">{article.code}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{article.categoryName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <BotBadge botAnswerable={article.botAnswerable} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {article.publishedBy ?? article.updatedBy} &middot;{" "}
                    {formatDate(article.publishedAt ?? article.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => onEdit(article)}>
                      <FaEdit /> Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Only <span className="font-semibold">published</span> articles are visible to clients or
        answerable by the chatbot. Everything else is in the Review Queue.
      </p>
    </div>
  );
}
