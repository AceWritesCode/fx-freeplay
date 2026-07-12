import type { ToolDefinition } from '../ToolRegistry';

// ─── Long Position Icon ──────────────────────────────────────────────────────
const LongPositionIcon = ({ className = 'w-5 h-5', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <path fill="currentColor" d="M5.5 20c1.2 0 2.22.86 2.45 2H25v1H7.95a2.5 2.5 0 1 1-2.45-3m0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M25 18H5v-1h20zm-11-4h3v1h-4V9h1zM5.5 4c1.2 0 2.22.86 2.45 2H25v1H7.95A2.5 2.5 0 1 1 5.5 4m0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3" />
  </svg>
);

// ─── Short Position Icon ─────────────────────────────────────────────────────
const ShortPositionIcon = ({ className = 'w-5 h-5', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <path fill="currentColor" d="M5.5 20c1.2 0 2.22.86 2.45 2H25v1H7.95a2.5 2.5 0 1 1-2.45-3m0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m9.52-7q.53 0 .93.2l.2.1q.27.17.46.43l.06.1q.2.3.25.73v.02h-.82v-.01a1 1 0 0 0-.36-.55 1.2 1.2 0 0 0-.73-.2q-.22 0-.4.06l-.12.04a1 1 0 0 0-.36.3 1 1 0 0 0-.13.43v.01q0 .2.09.34t.26.25q.19.1.48.2l.76.21q.71.2 1.06.57l.08.1q.27.36.27.9v.02q0 .45-.2.81l-.07.1a2 2 0 0 1-.72.62q-.45.22-1.02.22-.42 0-.77-.1l-.22-.1a2 2 0 0 1-.7-.55 2 2 0 0 1-.3-.84v-.02h.86v.01q.1.36.39.57t.76.22q.34 0 .59-.11a1 1 0 0 0 .4-.31l.06-.1q.09-.17.08-.36a1 1 0 0 0-.1-.38l-.1-.1a1.5 1.5 0 0 0-.65-.34l-.78-.21q-.46-.13-.77-.34-.3-.21-.45-.51-.14-.3-.14-.73 0-.5.24-.88l.06-.09q.24-.32.61-.5.43-.23.96-.23M25 12H5v-1h20zM5.5 4c1.2 0 2.22.86 2.45 2H25v1H7.95A2.5 2.5 0 1 1 5.5 4m0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3" />
  </svg>
);

// ─── Shared overlay helper ────────────────────────────────────────────────────
/**
 * Risk/Reward overlay:
 *  • Point 0 = entry price
 *  • Point 1 = target price (take-profit)
 *  • Point 2 = stop price  (stop-loss)
 *
 * For Long:  target > entry > stop  (green zone above, red zone below)
 * For Short: target < entry < stop  (green zone below, red zone above)
 */
const createRiskRewardOverlay = (name: string, isLong: boolean) => ({
  name,
  totalStep: 3,
  needDefaultPointFigure: false,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  createPointFigures: ({ overlay, coordinates, bounding }: any) => {
    if (!coordinates || coordinates.length < 1) return [];
    const figures: any[] = [];

    const entryY = coordinates[0]?.y ?? 0;
    const targetY = coordinates[1]?.y ?? (isLong ? entryY - 60 : entryY + 60);
    const stopY   = coordinates[2]?.y ?? (isLong ? entryY + 30 : entryY - 30);

    const left = 0;
    const right = bounding?.width ?? 800;

    // ── Profit zone ────────────────────────────────────────────────────────
    const profitTop    = isLong ? Math.min(targetY, entryY) : Math.min(entryY, stopY);
    const profitBottom = isLong ? Math.max(targetY, entryY) : Math.max(entryY, stopY);
    figures.push({
      type: 'rect',
      attrs: {
        x: left,
        y: profitTop,
        width: right - left,
        height: Math.max(1, profitBottom - profitTop),
      },
      styles: { color: 'rgba(38,166,154,0.15)', borderColor: 'rgba(38,166,154,0.4)', borderSize: 0 },
    });

    // ── Stop/Loss zone ─────────────────────────────────────────────────────
    const lossTop    = isLong ? Math.min(entryY, stopY) : Math.min(targetY, entryY);
    const lossBottom = isLong ? Math.max(entryY, stopY) : Math.max(targetY, entryY);
    figures.push({
      type: 'rect',
      attrs: {
        x: left,
        y: lossTop,
        width: right - left,
        height: Math.max(1, lossBottom - lossTop),
      },
      styles: { color: 'rgba(239,83,80,0.15)', borderColor: 'rgba(239,83,80,0.4)', borderSize: 0 },
    });

    // ── Entry line ─────────────────────────────────────────────────────────
    figures.push({
      type: 'line',
      attrs: { coordinates: [{ x: left, y: entryY }, { x: right, y: entryY }] },
      styles: { color: '#f0b429', size: 1, style: 'dashed', dashedValue: [4, 4] },
    });

    // ── Target line ────────────────────────────────────────────────────────
    if (coordinates.length >= 2) {
      figures.push({
        type: 'line',
        attrs: { coordinates: [{ x: left, y: targetY }, { x: right, y: targetY }] },
        styles: { color: '#26a69a', size: 1 },
      });
    }

    // ── Stop line ──────────────────────────────────────────────────────────
    if (coordinates.length >= 3) {
      figures.push({
        type: 'line',
        attrs: { coordinates: [{ x: left, y: stopY }, { x: right, y: stopY }] },
        styles: { color: '#ef5350', size: 1 },
      });
    }

    // ── Anchor dots ────────────────────────────────────────────────────────
    coordinates.forEach((coord: any, i: number) => {
      const colors = ['#f0b429', '#26a69a', '#ef5350'];
      figures.push({
        type: 'circle',
        attrs: { x: coord.x, y: coord.y, r: 4 },
        styles: { color: colors[i] ?? '#999' },
      });
    });

    return figures;
  },
});

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const LongPositionTool: ToolDefinition = {
  id: 'longPosition',
  name: 'Long position',
  icon: LongPositionIcon as any,
  group: 'forecast',
  settingsSchema: [],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: {} }],
  createOverlayDef: () => createRiskRewardOverlay('longPosition', true),
};

export const ShortPositionTool: ToolDefinition = {
  id: 'shortPosition',
  name: 'Short position',
  icon: ShortPositionIcon as any,
  group: 'forecast',
  settingsSchema: [],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: {} }],
  createOverlayDef: () => createRiskRewardOverlay('shortPosition', false),
};
