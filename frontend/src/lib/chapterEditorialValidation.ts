export type ChapterPublicationStatus = 'draft' | 'published' | 'scheduled';

const suspiciousHTMLPattern = /<\s*(script|iframe|object|embed|form|input|button|style|link|meta)|on[a-z]+\s*=|javascript:/i;
const markdownNoisePattern = /[>#*_~\-\[\]()!`]/g;

function hasMeaningfulContent(content: string) {
  const cleaned = content.replace(suspiciousHTMLPattern, ' ').replace(markdownNoisePattern, ' ').replace(/\s+/g, '');
  return cleaned.length >= 20;
}

export function getChapterEditorialError(options: {
  title: string;
  content: string;
  status: ChapterPublicationStatus;
  publishAt?: string;
}) {
  const title = options.title.trim();
  const content = options.content.trim();

  if (!title || !content) {
    return 'Title and content are required';
  }

  if (options.status === 'published' || options.status === 'scheduled') {
    if (suspiciousHTMLPattern.test(content)) {
      return 'Remove pasted HTML like scripts, forms, iframes, or inline handlers before publishing';
    }
    if (!hasMeaningfulContent(content)) {
      return 'Published chapters need more meaningful content before they can go live';
    }
  }

  if (options.status === 'scheduled') {
    if (!options.publishAt) {
      return 'Choose a publish date and time for scheduled chapters';
    }
    const timestamp = new Date(options.publishAt).getTime();
    if (Number.isNaN(timestamp)) {
      return 'Choose a valid publish date and time';
    }
    if (timestamp <= Date.now()) {
      return 'Scheduled publish time must be in the future';
    }
  }

  return '';
}