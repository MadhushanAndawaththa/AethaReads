import DOMPurify from 'dompurify';

const FORBIDDEN_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form'];
const FORBIDDEN_ATTR = ['onerror', 'onclick', 'onload', 'onmouseover', 'style'];

export function sanitizeChapterHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: FORBIDDEN_ATTR,
  });
}