"use client";
import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon,
  Heading1 as Heading1Icon,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  AlignLeft as AlignLeftIcon,
  AlignCenter as AlignCenterIcon,
  AlignRight as AlignRightIcon,
  AlignJustify as AlignJustifyIcon,
  Undo2,
  Redo2,
} from "lucide-react";

interface CvVariantEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const ToolbarButton = ({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150 ${
      active
        ? "bg-[#0D9F6E] text-white"
        : "text-career-black-200 hover:bg-career-gray-300"
    }`}
  >
    {children}
  </button>
);

/**
 * Lean rich-text editor for the CV Variant review step — just the
 * formatting a CV needs (bold/italic/underline/strike, headings, lists,
 * alignment) so the saved PDF/DOCX comes out looking like a presentable,
 * job-ready CV rather than plain unformatted text.
 */
export default function CvVariantEditor({ content, onChange }: CvVariantEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: content || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "min-h-[22rem] max-h-[28rem] overflow-y-auto cursor-text px-4 py-3 focus:outline-none " +
          "[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1 " +
          "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1 [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:text-career-blue-800 " +
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 " +
          "[&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5",
      },
    },
    immediatelyRender: false,
  });

  // Keep the editor in sync if `content` is replaced wholesale from outside
  // (e.g. a fresh generation), without fighting the user's own typing.
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "<p></p>");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-career-gray-300">
      <div className="flex flex-wrap items-center gap-1 border-b border-career-gray-300 bg-career-gray-400/60 p-1.5">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <StrikethroughIcon size={16} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-career-gray-300" />

        <ToolbarButton
          label="Heading 1 (name)"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1Icon size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2 (section)"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2Icon size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3 (role title)"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3Icon size={16} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-career-gray-300" />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrderedIcon size={16} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-career-gray-300" />

        <ToolbarButton
          label="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeftIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenterIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRightIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Justify"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustifyIcon size={16} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-career-gray-300" />

        <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={16} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}
