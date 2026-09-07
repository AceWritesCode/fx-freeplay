import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractWhatsNew, renderSimpleMarkdown } from '../releaseNotesParser.ts';

describe('Release Notes Parser', () => {
  it('extracts section between ## What\'s New and next heading', () => {
    const raw = `# Release v0.0.8

## What's New
- Added targeted release notes extraction
- Improved startup logic
- Graceful restart notification

## Technical Details
- Refactored IPC listeners
- Cleaned up unneeded files
`;

    const extracted = extractWhatsNew(raw);
    assert.equal(
      extracted,
      `- Added targeted release notes extraction\n- Improved startup logic\n- Graceful restart notification`
    );
  });

  it('handles ### What’s New with unicode apostrophe and stops at next heading', () => {
    const raw = `### What’s New
- Clean and targeted notes
- Automatic updates

### Internal Notes
- Internal build flags
`;

    const extracted = extractWhatsNew(raw);
    assert.equal(extracted, `- Clean and targeted notes\n- Automatic updates`);
  });

  it('extracts to end of string if no following heading exists', () => {
    const raw = `## What's New
- Feature A
- Feature B`;

    const extracted = extractWhatsNew(raw);
    assert.equal(extracted, `- Feature A\n- Feature B`);
  });

  it('returns fallback string when heading is not found or payload is empty', () => {
    assert.equal(extractWhatsNew(''), 'Performance improvements and bug fixes.');
    assert.equal(extractWhatsNew(null), 'Performance improvements and bug fixes.');
    assert.equal(
      extractWhatsNew('# Release without whats new heading\nSome notes here'),
      'Performance improvements and bug fixes.'
    );
  });

  it('handles array of notes from electron-updater payload', () => {
    const payload = [
      { note: '## What\'s New\n- Update from array object\n\n## More' }
    ];
    assert.equal(extractWhatsNew(payload), '- Update from array object');
  });

  it('renders simple markdown to HTML with bullet points and bold styling', () => {
    const md = `- Feature **one** with \`code\`\n- Feature two\n\nNormal paragraph note.`;
    const html = renderSimpleMarkdown(md);

    assert.ok(html.includes('<ul class="list-disc pl-5 space-y-1.5 text-xs text-txt-secondary">'));
    assert.ok(html.includes('<li>Feature <strong class="text-txt-primary font-semibold">one</strong> with <code class="px-1 py-0.5 rounded bg-surface-elevated font-mono text-[11px] text-accent">code</code></li>'));
    assert.ok(html.includes('<li>Feature two</li>'));
    assert.ok(html.includes('<p class="text-xs text-txt-secondary leading-relaxed">Normal paragraph note.</p>'));
  });
});
