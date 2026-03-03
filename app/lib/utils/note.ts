/**
 * Note Utility Functions
 * Shared helpers for processing note content (HTML stripping, previews, etc.)
 */

/**
 * Strip all HTML tags from a string, returning plain text.
 */
export function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Generate a plain-text preview from HTML content, truncated to `maxLength`.
 * Appends "..." when the text is longer than the limit.
 */
export function getTextPreview(html: string, maxLength: number = 100): string {
  const text = stripHTML(html);
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}
