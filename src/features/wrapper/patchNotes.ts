export interface PatchNoteSection {
  title: string;
  items: string[];
}

export interface PatchNotesData {
  version: string;
  releaseDate: string;
  title: string;
  summary: string;
  highlights: string[];
  sections: PatchNoteSection[];
}

export const CURRENT_PATCH_NOTES: PatchNotesData = {
  version: '0.0.8',
  releaseDate: 'September 2026',
  title: 'Silent Background Updates & Version Tracker',
  summary: 'Enhanced the desktop experience with seamless background auto-updates, zero-click installations, and persistent release notes tracking.',
  highlights: [
    'Silent background update verification on application startup',
    'Discreet status badge in header without interrupting workflow',
    'Interactive What\'s New modal tracking latest version changes',
    'Direct release notes viewer in Settings > Updates',
  ],
  sections: [
    {
      title: 'Auto-Update Pipeline',
      items: [
        'Automatic silent checks on startup when auto-update verification is enabled',
        'Top-right unobtrusive indicator displays "Update Available" or live download progress',
        'Instant automatic restart and installation once background download finishes',
      ],
    },
    {
      title: 'Release Notes & Onboarding',
      items: [
        'Interactive "What\'s New" modal displays automatically on first launch after an update',
        'Dismissing notes saves version preference locally so notes only display once',
        'Full release patch notes always reviewable under Settings > Updates',
      ],
    },
    {
      title: 'Performance & Optimization',
      items: [
        'Removed redundant unhashed bundle assets, reducing installer package footprint',
        'Streamlined prototype directory hierarchy and hardened IPC external link handling',
      ],
    },
  ],
};
