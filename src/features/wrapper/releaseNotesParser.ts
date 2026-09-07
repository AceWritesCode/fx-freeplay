/**
 * Extracts the "What's New" section from GitHub release notes.
 * Matches headings such as ## What's New, ### What's New, ## What’s New (case-insensitive)
 * and captures content until the next markdown header (## or ###) or end of string.
 */
export function extractWhatsNew(rawNotes: unknown): string {
  if (!rawNotes) return 'Performance improvements and bug fixes.';

  let notesText = '';
  if (typeof rawNotes === 'string') {
    notesText = rawNotes;
  } else if (Array.isArray(rawNotes)) {
    notesText = rawNotes
      .map((item) => (typeof item === 'string' ? item : item?.note || ''))
      .filter(Boolean)
      .join('\n\n');
  } else if (typeof rawNotes === 'object') {
    notesText = (rawNotes as any).note || '';
  }

  if (!notesText.trim()) {
    return 'Performance improvements and bug fixes.';
  }

  // Look specifically for ## What's New or ### What's New
  // Capture everything until the next ## or ### heading or end of string
  const regex = /#{2,3}\s*What['’]?s\s+New[\r\n]+([\s\S]*?)(?=(?:\r?\n#{2,3}\s+)|$)/i;
  const match = notesText.match(regex);

  if (match && match[1]?.trim()) {
    return match[1].trim();
  }

  return 'Performance improvements and bug fixes.';
}

/**
 * Saves extracted release notes from updater payload to localStorage.
 */
export function savePendingReleaseNotes(data: any): void {
  if (typeof localStorage === 'undefined') return;
  const rawNotes = data?.releaseNotes;
  const extracted = extractWhatsNew(rawNotes);
  localStorage.setItem('pendingReleaseNotes', extracted);
}

/**
 * Safely converts simple Markdown text into HTML for rendering release notes.
 * Converts:
 * - Bold: **text** -> <strong>text</strong>
 * - Inline code: `code` -> <code>code</code>
 * - Bullet lists: lines starting with - or * -> <li>...</li> inside <ul>
 * - Paragraphs
 */
export function renderSimpleMarkdown(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown.split(/\r?\n/);
  const htmlParts: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      continue;
    }

    const isBullet = line.startsWith('- ') || line.startsWith('* ');

    if (isBullet) {
      if (!inList) {
        htmlParts.push('<ul class="list-disc pl-5 space-y-1.5 text-xs text-txt-secondary">');
        inList = true;
      }
      const content = line.substring(2).trim();
      const formatted = formatInlineMarkdown(content);
      htmlParts.push(`<li>${formatted}</li>`);
    } else {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      const formatted = formatInlineMarkdown(line);
      htmlParts.push(`<p class="text-xs text-txt-secondary leading-relaxed">${formatted}</p>`);
    }
  }

  if (inList) {
    htmlParts.push('</ul>');
  }

  return htmlParts.join('\n');
}

function formatInlineMarkdown(text: string): string {
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text**
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong class="text-txt-primary font-semibold">$1</strong>');
  // Inline code: `code`
  safe = safe.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-surface-elevated font-mono text-[11px] text-accent">$1</code>');
  // Italic: *text*
  safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return safe;
}
