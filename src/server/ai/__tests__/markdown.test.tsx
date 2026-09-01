import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from '@/components/chat/markdown';

/**
 * The assistant renders model output, so these tests exist mainly to prove the
 * renderer cannot emit executable or attacker-controlled HTML.
 */
const render = (content: string) => renderToStaticMarkup(<Markdown content={content} />);

describe('Markdown — safety', () => {
  it('escapes raw HTML instead of rendering it', () => {
    const html = render('<img src=x onerror="alert(1)">');
    // The angle brackets are escaped, so no element is created and the
    // `onerror` text survives only as inert character data.
    assert.ok(!html.includes('<img'));
    assert.ok(html.includes('&lt;img'));
    assert.ok(!/onerror\s*=\s*"[^&]/.test(html));
  });

  it('does not execute script tags', () => {
    const html = render('<script>alert(1)</script>');
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });

  it('drops javascript: links, keeping the text', () => {
    const html = render('[click me](javascript:alert(1))');
    // No anchor is emitted at all — the markdown is left as plain text.
    assert.ok(!html.includes('<a '));
    assert.ok(!/href=/.test(html));
    assert.ok(html.includes('click me'));
  });

  it('drops data: URLs', () => {
    const html = render('[x](data:text/html;base64,PHNjcmlwdD4=)');
    assert.ok(!html.includes('<a '));
    assert.ok(!/href=/.test(html));
  });

  it('allows http(s), relative, mailto and tel links', () => {
    assert.match(render('[a](https://example.com)'), /href="https:\/\/example\.com"/);
    assert.match(render('[b](/services/branding)'), /href="\/services\/branding"/);
    assert.match(render('[c](mailto:info@elenor-marketing.com)'), /href="mailto:/);
    assert.match(render('[d](tel:+201201137373)'), /href="tel:/);
  });

  it('adds noopener noreferrer to external links only', () => {
    assert.match(render('[a](https://example.com)'), /rel="noopener noreferrer"/);
    assert.ok(!render('[b](/services)').includes('noreferrer'));
  });
});

describe('Markdown — formatting', () => {
  it('renders paragraphs', () => {
    assert.match(render('Hello there'), /<p[^>]*>Hello there<\/p>/);
  });

  it('renders bullet and ordered lists', () => {
    assert.match(render('- one\n- two'), /<ul[^>]*>.*<li>one<\/li>/s);
    assert.match(render('1. one\n2. two'), /<ol[^>]*>.*<li>one<\/li>/s);
  });

  it('renders headings', () => {
    assert.match(render('## Services'), /<h2[^>]*>Services<\/h2>/);
    assert.match(render('### Detail'), /<h3[^>]*>Detail<\/h3>/);
  });

  it('renders bold, italic and inline code', () => {
    assert.match(render('**bold**'), /<strong[^>]*>bold<\/strong>/);
    assert.match(render('*italic*'), /<em>italic<\/em>/);
    assert.match(render('`code`'), /<code[^>]*>code<\/code>/);
  });

  it('renders fenced code blocks', () => {
    assert.match(render('```ts\nconst a = 1;\n```'), /<pre[^>]*>.*const a = 1;.*<\/pre>/s);
  });

  it('renders an unterminated fence so a streaming block still shows', () => {
    assert.match(render('```\npartial output'), /<pre[^>]*>.*partial output/s);
  });

  it('renders an empty string without throwing', () => {
    assert.doesNotThrow(() => render(''));
  });
});
