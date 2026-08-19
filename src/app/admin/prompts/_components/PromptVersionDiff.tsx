"use client";

import { useMemo } from "react";
import { diffLines } from "diff";
import { VcsPromptVersion } from "../hooks/use-vcs-prompts";
import { VERSION_STATUS_LABEL } from "./versionStatus";

interface PromptVersionDiffProps {
  promptKey: string;
  left: VcsPromptVersion | null;
  right: VcsPromptVersion | null;
}

const PromptVersionDiff = ({ promptKey, left, right }: PromptVersionDiffProps) => {
  const parts = useMemo(() => {
    if (!left || !right) return [];
    return diffLines(left.prompt, right.prompt);
  }, [left, right]);

  if (!left || !right) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
        Select two versions from the list to compare them.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-bold text-gray-900">{promptKey} · Version diff</h3>
        <p className="text-xs text-gray-400">
          Comparing v{left.version} ({VERSION_STATUS_LABEL[left.status]}) ⇄ v{right.version} (
          {VERSION_STATUS_LABEL[right.status]})
        </p>
      </div>

      <pre className="flex-1 overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {parts.map((part, index) => (
          <span
            key={index}
            className={
              part.added
                ? "block bg-emerald-50 text-emerald-800"
                : part.removed
                  ? "block bg-red-50 text-red-700"
                  : "block text-gray-700"
            }
          >
            {part.value
              .replace(/\n$/, "")
              .split("\n")
              .map((line, lineIndex) => (
                <span key={lineIndex} className="block px-1">
                  {part.added ? "+ " : part.removed ? "- " : "  "}
                  {line}
                </span>
              ))}
          </span>
        ))}
      </pre>
    </div>
  );
};

export default PromptVersionDiff;
