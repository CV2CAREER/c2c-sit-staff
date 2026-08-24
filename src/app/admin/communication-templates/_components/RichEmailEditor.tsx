"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List as ListIcon,
  ListOrdered,
  Link2,
  Heading2,
  AlignLeft,
  AlignCenter,
  Undo2,
  Redo2,
  Eraser,
  Code2,
  MonitorSmartphone,
} from "lucide-react";

interface RichEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
}

export interface RichEmailEditorHandle {
  /** Inserts literal text (e.g. an EJS placeholder) at the current cursor position, in whichever mode is active. */
  insertText: (text: string) => void;
}

type Mode = "visual" | "code";

const DOCTYPE = "<!doctype html>";
const FALLBACK_DOC = "<!doctype html><html><body></body></html>";

// Matches a simple EJS output tag like `<%= name %>` or `<%= user.firstName %>`
// — deliberately narrow (not `<% %>` scriptlets or `<%- %>` unescaped output)
// since this is the only shape the "insert variable" chips ever produce.
// Anchored at the start (not global) — wrapEjsTagsAsChips below tests it at
// a specific scan position, not across the whole string.
const EJS_VAR_TAG_AT_START = /^<%=\s*([a-zA-Z_$][\w.]*)\s*%>/;
const EJS_VAR_TAG_WHOLE = /^<%=\s*([a-zA-Z_$][\w.]*)\s*%>$/;
const EJS_VAR_CHIP_ATTR = "data-ejs-var";

/**
 * A raw `<%= name %>` text node cannot survive a round trip through the
 * iframe: the browser's HTML serializer escapes `<`/`>` in text nodes on the
 * way out (turning it into `&lt;%= name %&gt;`, which EJS no longer
 * recognizes as its tag syntax — this was the actual bug behind variables
 * rendering as literal text in sent emails). Representing each variable as
 * a real, non-editable element instead means there's no text-node escaping
 * to survive — the chip's outerHTML round-trips intact either way.
 */
const chipHtml = (name: string) =>
  `<span class="ejs-var" contenteditable="false" ${EJS_VAR_CHIP_ATTR}="${name}" style="display:inline-block;padding:1px 6px;margin:0 1px;border-radius:10px;background:#EFF6FF;color:#1D4ED8;font-family:monospace;font-size:0.85em;user-select:all;">${name}</span>`;

/**
 * Raw body (as stored/loaded) -> safe-to-parse-as-HTML doc for the iframe.
 *
 * Only wraps a `<%= name %>` that sits in actual text content. One that's
 * already inside an HTML attribute value (e.g. `href="<%= frontendUrl %>"`)
 * is left completely untouched — attribute values never had the escaping
 * problem chips exist to solve (only text-node serialization escapes `<`),
 * so wrapping one there would insert a `<span>` literally inside a quoted
 * attribute string and corrupt the tag. A blind string-replace can't tell
 * the two apart (EJS's `<...>` delimiters look like a tag to a naive regex
 * either way), so this walks the string character-by-character tracking
 * whether it's currently inside a real HTML tag, and inside a quoted
 * attribute value within that tag.
 */
const wrapEjsTagsAsChips = (html: string): string => {
  let out = "";
  let i = 0;
  let inTag = false;
  let quoteChar: string | null = null;

  while (i < html.length) {
    const ch = html[i];

    if (inTag) {
      if (quoteChar) {
        if (ch === quoteChar) quoteChar = null;
      } else if (ch === '"' || ch === "'") {
        quoteChar = ch;
      } else if (ch === ">") {
        inTag = false;
      }
      out += ch;
      i++;
      continue;
    }

    // Not inside a tag. A real HTML tag starts with `<` followed by a
    // letter, `/`, `!`, or `?` — anything else starting with `<` (in
    // practice, only an EJS tag) is left for the variable check below.
    if (ch === "<" && /[a-zA-Z/!?]/.test(html[i + 1] ?? "")) {
      inTag = true;
      out += ch;
      i++;
      continue;
    }

    const variableMatch = EJS_VAR_TAG_AT_START.exec(html.slice(i));
    if (variableMatch) {
      out += chipHtml(variableMatch[1]);
      i += variableMatch[0].length;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
};

/** Iframe doc -> raw body (as stored) — inverse of wrapEjsTagsAsChips, run on the serialized string, not the live DOM, so the chips stay intact for continued editing. */
const unwrapEjsChips = (html: string) =>
  html.replace(
    new RegExp(`<span class="ejs-var"[^>]*${EJS_VAR_CHIP_ATTR}="([^"]*)"[^>]*>[\\s\\S]*?</span>`, "g"),
    (_match, name) => `<%= ${name} %>`,
  );

const serialize = (doc: Document) => `${DOCTYPE}\n${unwrapEjsChips(doc.documentElement.outerHTML)}`;

/**
 * Edits the actual HTML document a template will be sent as — not a stripped-down
 * fragment — so header/footer chrome and inline styles survive untouched. Visual
 * mode runs the iframe in designMode with a small execCommand toolbar; Code mode
 * exposes the raw HTML/EJS for anyone who needs it.
 *
 * The iframe's `srcDoc` is only ever set from a snapshot taken when (re-)entering
 * Visual mode, keyed so the iframe fully remounts — never bound directly to
 * `value`, since updating `srcDoc` on a live iframe reloads it and wipes the
 * caret/selection on every keystroke.
 */
export const RichEmailEditor = forwardRef<RichEmailEditorHandle, RichEmailEditorProps>(
  function RichEmailEditor({ value, onChange, minHeight = 360 }, ref) {
    const [mode, setMode] = useState<Mode>("visual");
    const [mountKey, setMountKey] = useState(0);
    const [srcDoc, setSrcDoc] = useState(() => wrapEjsTagsAsChips(value || FALLBACK_DOC));
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const valueRef = useRef(value);
    valueRef.current = value;
    // Tracks the last value *this editor itself* produced, so we can tell a
    // keystroke-driven update (ignore, DOM is already current) apart from an
    // external one — e.g. swapping the Audience skeleton, or loading a
    // different template — which does need a resync.
    const lastEmittedRef = useRef(value);

    const resyncFromValue = (nextValue: string) => {
      lastEmittedRef.current = nextValue;
      setSrcDoc(wrapEjsTagsAsChips(nextValue || FALLBACK_DOC));
      setMountKey((k) => k + 1);
    };

    useEffect(() => {
      if (mode !== "visual") return;
      if (value === lastEmittedRef.current) return;
      resyncFromValue(value);
    }, [value, mode]);

    const enterVisualMode = () => {
      if (mode === "visual") return;
      resyncFromValue(valueRef.current);
      setMode("visual");
    };

    const handleIframeLoad = () => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      doc.designMode = "on";
      doc.addEventListener("input", () => {
        const html = serialize(doc);
        lastEmittedRef.current = html;
        onChange(html);
      });
    };

    const withFocusedDoc = (fn: (doc: Document) => void) => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      iframeRef.current?.contentWindow?.focus();
      fn(doc);
      const html = serialize(doc);
      lastEmittedRef.current = html;
      onChange(html);
    };

    const exec = (command: string, arg?: string) =>
      withFocusedDoc((doc) => doc.execCommand(command, false, arg));

    const insertLink = () => {
      const url = window.prompt("Link URL (e.g. https://example.com)");
      if (!url) return;
      exec("createLink", url);
    };

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        if (mode === "visual") {
          // A variable placeholder becomes a real (non-editable) chip element
          // instead of raw text — see the module-level comment on chipHtml
          // for why plain text can't survive the round trip intact.
          const variableMatch = text.match(EJS_VAR_TAG_WHOLE);
          if (variableMatch) {
            exec("insertHTML", chipHtml(variableMatch[1]));
          } else {
            exec("insertText", text);
          }
          return;
        }
        const textarea = textareaRef.current;
        if (!textarea) return;
        const current = valueRef.current;
        const start = textarea.selectionStart ?? current.length;
        const end = textarea.selectionEnd ?? current.length;
        const next = `${current.slice(0, start)}${text}${current.slice(end)}`;
        onChange(next);
        requestAnimationFrame(() => {
          textarea.focus();
          const caret = start + text.length;
          textarea.setSelectionRange(caret, caret);
        });
      },
    }));

    const toolbarButtons: { label: string; icon: React.ReactNode; onClick: () => void }[] = [
      { label: "Bold", icon: <Bold size={16} />, onClick: () => exec("bold") },
      { label: "Italic", icon: <Italic size={16} />, onClick: () => exec("italic") },
      { label: "Underline", icon: <UnderlineIcon size={16} />, onClick: () => exec("underline") },
      { label: "Heading", icon: <Heading2 size={16} />, onClick: () => exec("formatBlock", "H2") },
      { label: "Bullet list", icon: <ListIcon size={16} />, onClick: () => exec("insertUnorderedList") },
      { label: "Numbered list", icon: <ListOrdered size={16} />, onClick: () => exec("insertOrderedList") },
      { label: "Align left", icon: <AlignLeft size={16} />, onClick: () => exec("justifyLeft") },
      { label: "Align center", icon: <AlignCenter size={16} />, onClick: () => exec("justifyCenter") },
      { label: "Insert link", icon: <Link2 size={16} />, onClick: insertLink },
      { label: "Clear formatting", icon: <Eraser size={16} />, onClick: () => exec("removeFormat") },
      { label: "Undo", icon: <Undo2 size={16} />, onClick: () => exec("undo") },
      { label: "Redo", icon: <Redo2 size={16} />, onClick: () => exec("redo") },
    ];

    return (
      <div className="rounded-lg border border-gray-300 overflow-hidden bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-0.5">
            {mode === "visual" ? (
              toolbarButtons.map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  title={btn.label}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={btn.onClick}
                  className="p-1.5 rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                >
                  {btn.icon}
                </button>
              ))
            ) : (
              <span className="text-xs text-gray-500 px-1.5 py-1">
                Raw HTML / EJS — for advanced edits only
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={enterVisualMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded ${
                mode === "visual" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <MonitorSmartphone size={14} /> Visual
            </button>
            <button
              type="button"
              onClick={() => setMode("code")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded ${
                mode === "code" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Code2 size={14} /> Code
            </button>
          </div>
        </div>

        {mode === "visual" ? (
          <iframe
            key={mountKey}
            ref={iframeRef}
            title="Email body editor"
            srcDoc={srcDoc}
            onLoad={handleIframeLoad}
            className="w-full bg-white"
            style={{ height: minHeight }}
            sandbox="allow-same-origin"
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full font-mono text-sm p-3 focus:outline-none resize-y"
            style={{ height: minHeight }}
            spellCheck={false}
          />
        )}
      </div>
    );
  },
);
