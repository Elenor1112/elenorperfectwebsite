import { Fragment, type ReactNode } from 'react';

/**
 * Minimal Markdown renderer for assistant messages.
 *
 * Written by hand rather than pulled from a library for one reason: it never
 * produces raw HTML. Output is a React element tree, so `dangerouslySetInnerHTML`
 * is never used and script/`javascript:` injection through model output is
 * structurally impossible rather than filtered after the fact.
 *
 * Supports the subset the assistant is told to use: headings, paragraphs,
 * bullet/ordered lists, fenced code, inline code, bold, italic, and links.
 */

/** Only http(s) and relative links survive; everything else renders as text. */
function safeHref(href: string): string | null {
  const trimmed = href.trim();
  if (/^(https?:\/\/|\/(?!\/)|#|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return null;
}

type Token = { type: 'text' | 'code' | 'bold' | 'italic' | 'link'; value: string; href?: string };

/** Tokenises inline markup. Ordered so code spans win over emphasis. */
function tokenizeInline(text: string): Token[] {
  const tokens: Token[] = [];
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]]+\]\([^)\s]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];

    if (raw.startsWith('`')) {
      tokens.push({ type: 'code', value: raw.slice(1, -1) });
    } else if (raw.startsWith('**') || raw.startsWith('__')) {
      tokens.push({ type: 'bold', value: raw.slice(2, -2) });
    } else if (raw.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(raw);
      const href = linkMatch ? safeHref(linkMatch[2]) : null;
      if (linkMatch && href) {
        tokens.push({ type: 'link', value: linkMatch[1], href });
      } else {
        tokens.push({ type: 'text', value: raw });
      }
    } else {
      tokens.push({ type: 'italic', value: raw.slice(1, -1) });
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) tokens.push({ type: 'text', value: text.slice(lastIndex) });
  return tokens;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return tokenizeInline(text).map((token, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (token.type) {
      case 'code':
        return (
          <code key={key} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em]">
            {token.value}
          </code>
        );
      case 'bold':
        return (
          <strong key={key} className="font-semibold text-white">
            {token.value}
          </strong>
        );
      case 'italic':
        return <em key={key}>{token.value}</em>;
      case 'link':
        return (
          <a
            key={key}
            href={token.href}
            target={token.href?.startsWith('http') ? '_blank' : undefined}
            rel={token.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="text-brand-glow underline decoration-brand-glow/40 underline-offset-2 hover:decoration-brand-glow"
          >
            {token.value}
          </a>
        );
      default:
        return <Fragment key={key}>{token.value}</Fragment>;
    }
  });
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; level: 2 | 3; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'code'; text: string; lang: string };

/** Groups lines into block-level structures. */
function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'p', text: paragraph.join(' ').trim() });
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // Fenced code block — consumed whole, including an unterminated fence so a
    // partially streamed block still renders.
    const fence = /^```(\w*)\s*$/.exec(line.trim());
    if (fence) {
      flushParagraph();
      const lang = fence[1] ?? '';
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
        body.push(lines[i]);
        i += 1;
      }
      blocks.push({ kind: 'code', text: body.join('\n'), lang });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        kind: 'h',
        level: heading[1].length === 2 ? 2 : 3,
        text: heading[2].trim(),
      });
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      const last = blocks.at(-1);
      if (last?.kind === 'ul') last.items.push(bullet[1]);
      else blocks.push({ kind: 'ul', items: [bullet[1]] });
      continue;
    }

    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      flushParagraph();
      const last = blocks.at(-1);
      if (last?.kind === 'ol') last.items.push(ordered[1]);
      else blocks.push({ kind: 'ol', items: [ordered[1]] });
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return blocks;
}

export function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-3 text-[0.9375rem] leading-relaxed text-white/85">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'h':
            return block.level === 2 ? (
              <h2 key={i} className="text-base font-semibold text-white">
                {renderInline(block.text, `h${i}`)}
              </h2>
            ) : (
              <h3 key={i} className="text-sm font-semibold text-white">
                {renderInline(block.text, `h${i}`)}
              </h3>
            );
          case 'ul':
            return (
              <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-brand-glow/70">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `ul${i}-${j}`)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="list-decimal space-y-1.5 pl-5 marker:text-brand-glow/70">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `ol${i}-${j}`)}</li>
                ))}
              </ol>
            );
          case 'code':
            return (
              <pre
                key={i}
                className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3"
              >
                <code className="font-mono text-[0.8125rem] text-white/80">{block.text}</code>
              </pre>
            );
          default:
            return <p key={i}>{renderInline(block.text, `p${i}`)}</p>;
        }
      })}
    </div>
  );
}
