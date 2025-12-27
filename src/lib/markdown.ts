/**
 * Safe Markdown Rendering Utilities
 *
 * WHY THIS EXISTS:
 * Raw markdown rendering with `marked` can be an XSS vector if content comes
 * from user-editable sources (like our Decap CMS). DOMPurify sanitizes the
 * HTML output to remove potentially malicious scripts and attributes.
 *
 * USAGE:
 * import { renderMarkdown } from '../lib/markdown';
 * <div set:html={renderMarkdown(content)} />
 */
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Render markdown to sanitized HTML
 * Safe for use with set:html directive
 */
export function renderMarkdown(content: string): string {
  const rawHtml = marked.parse(content, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml);
}

/**
 * Render markdown to sanitized HTML (async version)
 * Use when you need async marked plugins
 */
export async function renderMarkdownAsync(content: string): Promise<string> {
  const rawHtml = await marked.parse(content);
  return DOMPurify.sanitize(rawHtml);
}
