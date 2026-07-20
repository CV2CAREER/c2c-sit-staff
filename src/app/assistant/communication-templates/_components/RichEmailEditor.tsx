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

const serialize = (doc: Document) => `${DOCTYPE}\n${doc.documentElement.outerHTML}`;

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
    const [srcDoc, setSrcDoc] = useState(() => value || FALLBACK_DOC);
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
      setSrcDoc(nextValue || FALLBACK_DOC);
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
          exec("insertText", text);
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
