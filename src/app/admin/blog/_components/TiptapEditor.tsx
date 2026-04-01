'use client';
import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { CodeBlock } from '@tiptap/extension-code-block';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { Blockquote } from '@tiptap/extension-blockquote';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  Heading1Icon,
  Heading2Icon,
  ListOrderedIcon,
  List as ListIcon,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  AlignLeftIcon,
  AlignCenterHorizontal,
  AlignRightIcon,
  AlignJustifyIcon,
  QuoteIcon,
  Code2,
  Link2Icon,
  Image as ImageIcon,
  Highlighter,
  Eraser,
} from 'lucide-react';

type TapProps = {
  content: string;
  setContent: (content: string) => void;
};

const TiptapEditor = ({ content, setContent }: TapProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily.configure({ types: ['textStyle'] }),
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      CodeBlock,
      BulletList,
      OrderedList,
      Blockquote,
      Subscript,
      Superscript,
    ],
    content: content || '<p><br></p>',
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'min-h-[200px] cursor-text focus:outline-none',
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '<p><br></p>');
    }
  }, [content, editor]);

  if (!isMounted || !editor) return null;

  return (
    <div className="border border-gray-300 rounded p-4">
      {/* Toolbar */}
      <div className="mb-2 flex gap-2 flex-wrap">
        <select
          onChange={(e) =>
            (editor?.chain() as any).focus().setFontFamily(e.target.value).run()
          }
        >
          <option value="">Default</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Tahoma">Tahoma</option>
        </select>

        <button onClick={() => editor.chain().focus().toggleBold().run()}>
          <BoldIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}>
          <ItalicIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()}>
          <StrikethroughIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1Icon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2Icon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleSubscript().run()}>
          <SubscriptIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleSuperscript().run()}>
          <SuperscriptIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrderedIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <ListIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeftIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenterHorizontal size={18} />
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRightIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustifyIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <QuoteIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code2 size={18} />
        </button>
        <button
          onClick={() =>
            editor.chain().focus().setLink({ href: prompt('Enter URL') || '' }).run()
          }
        >
          <Link2Icon size={18} />
        </button>

        {/* Image Upload */}
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          id="tiptap-image-upload"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
              const src = event.target?.result as string;
              editor?.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(file);
          }}
        />
        <button
          onClick={() => document.getElementById('tiptap-image-upload')?.click()}
          type="button"
        >
          <ImageIcon size={18} />
        </button>

        {/* Highlight */}
        <button onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter size={18} />
        </button>

        {/* Clear Formatting */}
        <button onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <Eraser size={18} />
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} className="min-h-[200px] cursor-text" />
    </div>
  );
};

export default TiptapEditor;
