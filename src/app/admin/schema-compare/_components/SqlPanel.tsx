"use client";

import { AlertTriangle, FileCode2 } from "lucide-react";
import type { CompareResult } from "./types";
import { CopyButton, DownloadButton, downloadFile, fileStamp } from "./ui";

const SqlPanel = ({ result }: { result: CompareResult }) => {
  if (!result.sql) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-gray-500">
        <FileCode2 className="h-8 w-8 text-gray-300" />
        Nothing to generate — the remaining differences (if any) are informational only.
      </div>
    );
  }

  const destructiveCount = result.items.filter((i) => i.destructive).length;

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong>Review before running.</strong> This script would bring{" "}
          <strong>{result.target.database}</strong> in line with <strong>{result.source.database}</strong>. It was
          generated from catalog metadata only and was <strong>not</strong> executed. Type changes and{" "}
          <code>SET NOT NULL</code> can fail on existing data or lock large tables; run against a backup first.
          {destructiveCount > 0 &&
            ` ${destructiveCount} destructive statement(s) (drops) are included but commented out.`}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <CopyButton text={result.sql} label="Copy SQL" what="SQL script copied" />
        <DownloadButton
          label="Download .sql"
          onClick={() =>
            downloadFile(
              `schema-sync_${result.source.database}_to_${result.target.database}_${fileStamp()}.sql`,
              result.sql,
              "application/sql",
            )
          }
        />
      </div>
      <pre className="max-h-[60vh] overflow-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
        {result.sql}
      </pre>
    </div>
  );
};

export default SqlPanel;
