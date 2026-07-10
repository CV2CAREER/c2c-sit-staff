/**
 * Renders an authored content block the way the client app presents it, so the
 * admin sees the real typography rather than the editor's chrome.
 */
export function buildContentPreviewHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      color: #374151;
      background: #f9fafb;
      padding: 24px;
      line-height: 1.65;
    }
    .sheet {
      max-width: 640px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 32px;
    }
    h1, h2, h3 { color: #111827; line-height: 1.3; }
    h1 { font-size: 1.75rem; margin-bottom: 16px; }
    h2 { font-size: 1.35rem; margin-bottom: 14px; }
    h3 { font-size: 1.05rem; margin: 20px 0 6px; }
    p { margin-bottom: 12px; }
    ul, ol { margin: 0 0 12px 20px; }
    li { margin-bottom: 6px; }
    blockquote {
      border-left: 3px solid #d1d5db;
      padding-left: 12px;
      color: #6b7280;
      margin-bottom: 12px;
    }
    a { color: #00568F; }
    img { max-width: 100%; height: auto; }
    .empty { color: #9ca3af; font-style: italic; }
  </style>
</head>
<body>
  <div class="sheet">
    ${body?.trim() ? body : '<p class="empty">This section has no content yet.</p>'}
  </div>
</body>
</html>`;
}
