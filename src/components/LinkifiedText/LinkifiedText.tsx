import * as React from "react";

// Plain admin-written text with clickable links, built WITHOUT dangerouslySetInnerHTML.
// Understands two forms:  https://example.com/page   and   [link text](https://example.com/page)
// Only http(s) addresses become links (so javascript: and similar can never be rendered as one);
// everything else stays as literal text. Keep line breaks by wrapping in whitespace-pre-line.
// Same behaviour as the customer app, so the builder preview matches what the customer sees.
const LINK_PATTERN = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"])/g;

export default function LinkifiedText({
  text,
  linkClassName = "text-[#0B96D6] underline break-words",
}: {
  text: string;
  linkClassName?: string;
}) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));

    const label = match[1] ?? match[3];
    const url = match[2] ?? match[3];
    nodes.push(
      <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className={linkClassName}>
        {label}
      </a>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));

  return <>{nodes}</>;
}
