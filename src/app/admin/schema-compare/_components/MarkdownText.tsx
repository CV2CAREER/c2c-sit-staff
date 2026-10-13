"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { CopyButton } from "./ui";

// Small, safe Markdown renderer for AI answers (no HTML injection — every
// piece becomes a React element). Handles what the models actually send:
// headings, bold/italic/inline code, lists, fenced code (with literal "\n"
// repaired), and tables — rendered as readable cards rather than a cramped
// grid, which is where long AI answers become unreadable.

const unescapeCode = (code: string) => code.replace(/\\n/g, "\n").replace(/\\t/g, "  ").trim();

// Inline: `code`, **bold**, *italic* / _italic_
const Inline = ({ text }: { text: string }) => {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null;
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code key={i} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-800">
              {p.slice(1, -1)}
            </code>
          );
        }
        if ((p.startsWith("**") && p.endsWith("**")) || (p.startsWith("__") && p.endsWith("__"))) {
          return (
            <strong key={i} className="font-semibold text-gray-900">
              {p.slice(2, -2)}
            </strong>
          );
        }
        if ((p.startsWith("*") && p.endsWith("*")) || (p.startsWith("_") && p.endsWith("_"))) {
          return <em key={i}>{p.slice(1, -1)}</em>;
        }
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
};

const CodeBlock = ({ code, lang }: { code: string; lang?: string }) => {
  const clean = unescapeCode(code);
  return (
    <div className="relative">
      <pre className="overflow-auto rounded-md bg-slate-900 p-3 pr-20 font-mono text-xs leading-relaxed text-slate-100">
        {lang && <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">{lang}</span>}
        {clean}
      </pre>
      <CopyButton text={clean} className="absolute right-1.5 top-1.5" what="Copied" />
    </div>
  );
};

// A table cell may carry inline code fences ("```sql\n…\n```") — split them out.
const CellContent = ({ text }: { text: string }) => {
  const pieces = text.split(/```(\w+)?/);
  if (pieces.length === 1) return <Inline text={text.replace(/<br\s*\/?>/gi, " ")} />;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < pieces.length; i++) {
    if (i % 2 === 0) {
      const t = pieces[i]?.trim();
      if (t) out.push(<p key={i}><Inline text={t} /></p>);
    } else {
      // odd index = language capture; the following piece is the code
      const lang = pieces[i];
      const code = pieces[i + 1] ?? "";
      out.push(<CodeBlock key={i} code={code} lang={lang} />);
      i++;
    }
  }
  return <div className="space-y-2">{out}</div>;
};

const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());

const TableCards = ({ header, rows }: { header: string[]; rows: string[][] }) => (
  <div className="space-y-2">
    {rows.map((row, r) => (
      <div key={r} className="rounded-md border border-gray-200 bg-white p-3">
        <div className="text-sm font-semibold text-gray-900">
          <CellContent text={row[0] ?? ""} />
        </div>
        <div className="mt-2 space-y-2">
          {header.slice(1).map((h, c) =>
            row[c + 1] ? (
              <div key={c}>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <Inline text={h} />
                </div>
                <div className="mt-0.5 text-sm text-gray-700">
                  <CellContent text={row[c + 1]} />
                </div>
              </div>
            ) : null,
          )}
        </div>
      </div>
    ))}
  </div>
);

type Block =
  | { type: "code"; lang?: string; code: string }
  | { type: "heading"; level: number; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "para"; text: string };

const parse = (src: string): Block[] => {
  const lines = src.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = line.match(/^\s*```(\w+)?\s*$/);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push({ type: "code", lang: fence[1], code: code.join("\n") });
      continue;
    }
    const heading = line.match(/^\s*(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }
    // A line that is only bold text reads as a heading too ("**Potentially blocking actions**").
    const boldTitle = line.match(/^\s*\*\*([^*]+)\*\*:?\s*$/);
    if (boldTitle) {
      blocks.push({ type: "heading", level: 3, text: boldTitle[1] });
      i++;
      continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = splitRow(lines[i]);
        if (cells.some(Boolean)) rows.push(cells);
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }
    const item = line.match(/^\s*([-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      const ordered = /\d/.test(item[1]);
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*([-*•]|\d+[.)])\s+(.*)$/);
        if (m) {
          items.push(m[2]);
          i++;
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          items[items.length - 1] += ` ${lines[i].trim()}`; // wrapped continuation line
          i++;
        } else break;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(```|#{1,4}\s|\||([-*•]|\d+[.)])\s)/.test(lines[i])) para.push(lines[i++].trim());
    if (para.length) blocks.push({ type: "para", text: para.join(" ") });
    else i++;
  }
  return blocks;
};

const MarkdownText = ({ text, className }: { text: string; className?: string }) => (
  <div className={cn("space-y-3 text-sm leading-relaxed text-gray-800", className)}>
    {parse(text).map((b, i) => {
      switch (b.type) {
        case "code":
          return <CodeBlock key={i} code={b.code} lang={b.lang} />;
        case "heading":
          return (
            <h4 key={i} className={cn("font-semibold text-gray-900", b.level <= 2 ? "text-base" : "text-sm")}>
              <Inline text={b.text} />
            </h4>
          );
        case "list": {
          const List = b.ordered ? "ol" : "ul";
          return (
            <List key={i} className={cn("space-y-1.5 pl-5", b.ordered ? "list-decimal" : "list-disc")}>
              {b.items.map((it, j) => (
                <li key={j}>
                  <Inline text={it} />
                </li>
              ))}
            </List>
          );
        }
        case "table":
          return <TableCards key={i} header={b.header} rows={b.rows} />;
        default:
          return (
            <p key={i}>
              <Inline text={b.text} />
            </p>
          );
      }
    })}
  </div>
);

export default MarkdownText;
