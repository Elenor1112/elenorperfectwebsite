'use client';

// Tiptap WYSIWYG editor. Uses the SAME extension list as the server renderer
// (src/lib/richtext/extensions.ts) so stored JSON always round-trips.

import { useCallback, useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react';
import { richTextExtensions } from '@/lib/richtext/extensions';
import type { RichTextDoc } from '@/db/schema';
import { PickerDialog } from './media/MediaPicker';
import { cn } from './ui';

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write…',
}: {
  value: RichTextDoc | null;
  onChange: (doc: RichTextDoc) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [...richTextExtensions, Placeholder.configure({ placeholder })],
    content: (value ?? { type: 'doc', content: [] }) as never,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'rich-text min-h-[260px] rounded-b-xl border border-t-0 border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-brand',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as RichTextDoc),
  });

  // Keep the editor in sync if the parent swaps documents (e.g. loading).
  useEffect(() => {
    if (!editor || !value) return;
    const current = JSON.stringify(editor.getJSON());
    if (current !== JSON.stringify(value)) {
      editor.commands.setContent(value as never, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return <div className="min-h-[300px] animate-pulse rounded-xl border border-white/10 bg-white/[0.02]" />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border border-white/10 bg-white/[0.05] px-2 py-1.5">
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Heading 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Heading 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote">
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} label="Code block">
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton active={editor.isActive('link')} onClick={setLink} label="Add link">
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          label="Remove link"
          disabled={!editor.isActive('link')}
        >
          <Link2Off className="h-4 w-4" />
        </ToolbarButton>
        <InlineImageButton
          onPick={(url, alt) => editor.chain().focus().setImage({ src: url, alt }).run()}
        />
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} label="Undo" disabled={!editor.can().undo()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} label="Redo" disabled={!editor.can().redo()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  disabled,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded p-1.5 transition disabled:opacity-30',
        active ? 'bg-brand/25 text-brand-glow' : 'text-white/60 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/10" />;
}

function InlineImageButton({ onPick }: { onPick: (url: string, alt: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Insert image"
        title="Insert image"
        className="rounded p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <ImageIcon className="h-4 w-4" />
      </button>
      {open ? (
        <PickerDialog
          onClose={() => setOpen(false)}
          onPick={(m) => {
            onPick(m.url, m.alt);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
