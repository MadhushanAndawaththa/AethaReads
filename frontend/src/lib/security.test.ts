import { describe, expect, it } from 'vitest';

import { sanitizeChapterHtml } from './security';

describe('sanitizeChapterHtml', () => {
  it('removes executable markup and preserves safe content', () => {
    const dirtyHtml = [
      '<p>Hello reader</p>',
      '<img src="x" onerror="alert(1)">',
      '<script>window.hacked = true</script>',
      '<a href="https://example.com/story">Continue</a>',
    ].join('');

    const sanitized = sanitizeChapterHtml(dirtyHtml);

    expect(sanitized).toContain('<p>Hello reader</p>');
    expect(sanitized).toContain('href="https://example.com/story"');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('window.hacked');
  });

  it('strips javascript protocol URLs from links', () => {
    const dirtyHtml = '<p><a href="javascript:alert(1)">Bad Link</a></p>';

    const sanitized = sanitizeChapterHtml(dirtyHtml);

    expect(sanitized).toContain('Bad Link');
    expect(sanitized).not.toContain('javascript:alert');
  });
});