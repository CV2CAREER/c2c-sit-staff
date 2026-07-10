/**
 * The editor emits markup such as `<p><br></p>` for an untouched document, so a
 * plain length check on the HTML never reports empty.
 */
export function isContentEmpty(html: string): boolean {
  if (!html) return true;
  const hasEmbeddedMedia = /<img\b/i.test(html);
  return toPlainText(html).length === 0 && !hasEmbeddedMedia;
}

export function toPlainText(html: string): string {
  return (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
