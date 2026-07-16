import { generateHTML } from '@tiptap/html';
import type { RichTextDoc } from '@/db/schema';
import { richTextExtensions } from './extensions';

export function richTextToHtml(doc: RichTextDoc | null | undefined): string {
  if (!doc || !Array.isArray(doc.content) || doc.content.length === 0) return '';
  try {
    return generateHTML(doc as never, richTextExtensions);
  } catch {
    return '';
  }
}

/** Extracts plain text (for reading-time estimates and search). */
export function richTextToPlainText(doc: RichTextDoc | null | undefined): string {
  if (!doc) return '';
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as { text?: string; content?: unknown[] };
    if (typeof n.text === 'string') parts.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(doc);
  return parts.join(' ');
}

/** Server component rendering stored Tiptap JSON. Styled via .rich-text. */
export function RichText({
  doc,
  className = '',
}: {
  doc: RichTextDoc | null | undefined;
  className?: string;
}) {
  const html = richTextToHtml(doc);
  if (!html) return null;
  return (
    <div
      className={`rich-text ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
