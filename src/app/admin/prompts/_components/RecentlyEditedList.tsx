"use client";

import { History, Pencil } from "lucide-react";
import { VcsPrompt } from "../hooks/use-vcs-prompts";
import { getEnabledStatus, ENABLED_STATUS_BADGE_CLASS, ENABLED_STATUS_LABEL } from "./promptStatus";

const formatRelative = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
};

interface RecentlyEditedListProps {
  prompts: VcsPrompt[];
  onSelect: (prompt: VcsPrompt) => void;
}

const RecentlyEditedList = ({ prompts, onSelect }: RecentlyEditedListProps) => {
  const recent = [...prompts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)] lg:w-72 lg:shrink-0">
      <div className="flex items-center gap-1.5">
        <History size={16} className="text-primary" />
        <h3 className="text-sm font-bold text-gray-900">Recently Edited</h3>
      </div>

      {recent.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-400">No prompts yet.</p>
      ) : (
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {recent.map((prompt) => {
            const status = getEnabledStatus(prompt);
            return (
              <button
                key={prompt.id}
                type="button"
                onClick={() => onSelect(prompt)}
                className="group flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-primary/5"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-mono text-xs font-medium text-gray-800">
                    {prompt.key}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${ENABLED_STATUS_BADGE_CLASS[status]}`}
                    >
                      {ENABLED_STATUS_LABEL[status]}
                    </span>
                    {formatRelative(prompt.updatedAt)}
                  </span>
                </div>
                <Pencil
                  size={13}
                  className="shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-primary"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentlyEditedList;
