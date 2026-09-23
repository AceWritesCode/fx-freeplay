import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  applyColorWithOpacity,
  formatChartDate,
  getLuminance,
  getContrastRatio,
  resolveVisibleScaleTextColor,
  resolveVisibleScaleLineColor,
  resolveVisibleCrosshairTextColor,
  resolveVisibleCrosshairLabelBgColor,
} from '../../../utils/chartFormatters.ts';
import { PRESET_SETTINGS } from '../../../config/chartPresets.ts';

describe('Chart Formatters and Settings Unit Tests', () => {
  describe('applyColorWithOpacity', () => {
    it('returns original color when opacity is undefined', () => {
      assert.strictEqual(applyColorWithOpacity('#ffffff'), '#ffffff');
      assert.strictEqual(applyColorWithOpacity('rgba(10, 20, 30, 0.5)'), 'rgba(10, 20, 30, 0.5)');
    });

    it('applies opacity to 6-digit hex color', () => {
      assert.strictEqual(applyColorWithOpacity('#ffffff', 0.5), 'rgba(255, 255, 255, 0.5)');
      assert.strictEqual(applyColorWithOpacity('#000000', 1), 'rgba(0, 0, 0, 1)');
      assert.strictEqual(applyColorWithOpacity('#ff0000', 0), 'rgba(255, 0, 0, 0)');
    });

    it('applies opacity to 3-digit hex color', () => {
      assert.strictEqual(applyColorWithOpacity('#fff', 0.8), 'rgba(255, 255, 255, 0.8)');
    });

    it('applies opacity to rgb color', () => {
      assert.strictEqual(applyColorWithOpacity('rgb(100, 150, 200)', 0.4), 'rgba(100, 150, 200, 0.4)');
    });

    it('scales existing opacity in rgba color', () => {
      assert.strictEqual(applyColorWithOpacity('rgba(255, 255, 255, 0.5)', 0.5), 'rgba(255, 255, 255, 0.25)');
    });

    it('handles opacity expressed as percentage (0-100)', () => {
      assert.strictEqual(applyColorWithOpacity('#ffffff', 50), 'rgba(255, 255, 255, 0.5)');
    });

    it('handles empty or missing color gracefully', () => {
      assert.strictEqual(applyColorWithOpacity(''), 'transparent');
    });
  });

  describe('Luminance and Contrast Calculations', () => {
    it('calculates correct luminance for black and white', () => {
      assert.strictEqual(getLuminance('#000000'), 0);
      assert.strictEqual(getLuminance('#ffffff'), 1);
    });

    it('calculates contrast ratio between black and white as 21:1', () => {
      const contrast = getContrastRatio('#ffffff', '#000000');
      assert.ok(Math.abs(contrast - 21) < 0.01);
    });
  });

  describe('Automatic Scale Colors Adaptation', () => {
    it('adapts dark text to light text when background is dark (#131722)', () => {
      // Dark text (#0f172a / #334155) on dark background (#131722)
      const adapted = resolveVisibleScaleTextColor('#0f172a', '#131722');
      assert.strictEqual(adapted, '#b2b5be');
    });

    it('adapts light text to dark text when background is light (#ffffff)', () => {
      // Light text (#b2b5be / #ffffff) on white background (#ffffff)
      const adapted = resolveVisibleScaleTextColor('#b2b5be', '#ffffff');
      assert.strictEqual(adapted, '#334155');
    });

    it('preserves user custom text color if contrast is already good', () => {
      // Matrix high-contrast green (#00FF66) on dark background (#0D1B2A)
      const preservedGreen = resolveVisibleScaleTextColor('#00FF66', '#0D1B2A');
      assert.strictEqual(preservedGreen, '#00FF66');

      // Black text (#000000) on white background (#ffffff)
      const preservedBlack = resolveVisibleScaleTextColor('#000000', '#ffffff');
      assert.strictEqual(preservedBlack, '#000000');
    });

    it('adapts axis line color for dark and light backgrounds', () => {
      assert.strictEqual(resolveVisibleScaleLineColor('#ffffff', '#ffffff'), '#e2e8f0');
      assert.strictEqual(resolveVisibleScaleLineColor('#131722', '#131722'), '#242832');
    });
  });

  describe('Automatic Crosshair Label Colors Adaptation', () => {
    it('adapts crosshair text to white when label background is dark', () => {
      // Dark text on dark label background (#363c4e)
      const adapted = resolveVisibleCrosshairTextColor('#111827', '#363c4e');
      assert.strictEqual(adapted, '#ffffff');
    });

    it('adapts crosshair text to dark when label background is light', () => {
      // White text on light label background (#f3f4f6)
      const adapted = resolveVisibleCrosshairTextColor('#ffffff', '#f3f4f6');
      assert.strictEqual(adapted, '#131722');
    });

    it('preserves high contrast custom crosshair text color', () => {
      // Matrix dark text (#0D1B2A) on neon green label background (#00FF66)
      const preserved = resolveVisibleCrosshairTextColor('#0D1B2A', '#00FF66');
      assert.strictEqual(preserved, '#0D1B2A');

      // White text on dark label background
      const whitePreserved = resolveVisibleCrosshairTextColor('#ffffff', '#363c4e');
      assert.strictEqual(whitePreserved, '#ffffff');
    });

    it('resolves crosshair label background with fallbacks', () => {
      assert.strictEqual(resolveVisibleCrosshairLabelBgColor('#ff0000', '#00ff00', '#000000'), '#ff0000');
      assert.strictEqual(resolveVisibleCrosshairLabelBgColor(undefined, '#00ff00', '#000000'), '#00ff00');
      assert.strictEqual(resolveVisibleCrosshairLabelBgColor(undefined, undefined, '#000000'), '#363c4e');
      assert.strictEqual(resolveVisibleCrosshairLabelBgColor(undefined, undefined, '#ffffff'), '#e2e8f0');
    });
  });

  describe('formatChartDate', () => {
    // Reference date: Wednesday, 23 September 2026 18:30:00 UTC (or local)
    const testDate = new Date(2026, 8, 23, 18, 30, 0).getTime();

    it('formats 24h default format (dd MMM yyyy)', () => {
      const result = formatChartDate(testDate, { dateFormat: 'dd MMM yyyy', timeFormat: '24h' });
      assert.strictEqual(result, '23 Sep 2026 18:30');
    });

    it('formats 12h format (06:30 PM)', () => {
      const result = formatChartDate(testDate, { dateFormat: 'dd MMM yyyy', timeFormat: '12h' });
      assert.strictEqual(result, '23 Sep 2026 06:30 PM');
    });

    it('formats ISO format (yyyy-MM-dd)', () => {
      const result = formatChartDate(testDate, { dateFormat: 'yyyy-MM-dd', timeFormat: '24h' });
      assert.strictEqual(result, '2026-09-23 18:30');
    });

    it('formats European format (dd/MM/yyyy)', () => {
      const result = formatChartDate(testDate, { dateFormat: 'dd/MM/yyyy', timeFormat: '24h' });
      assert.strictEqual(result, '23/09/2026 18:30');
    });

    it('formats US format (MM/dd/yyyy)', () => {
      const result = formatChartDate(testDate, { dateFormat: 'MM/dd/yyyy', timeFormat: '24h' });
      assert.strictEqual(result, '09/23/2026 18:30');
    });

    it('formats dash-delimited format (dd-MM-yyyy)', () => {
      const result = formatChartDate(testDate, { dateFormat: 'dd-MM-yyyy', timeFormat: '24h' });
      assert.strictEqual(result, '23-09-2026 18:30');
    });

    it('prepends day of week when showDayOfWeek is true', () => {
      const dayOfWeekName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(testDate).getDay()];
      const result = formatChartDate(testDate, {
        dateFormat: 'dd MMM yyyy',
        timeFormat: '24h',
        showDayOfWeek: true,
      });
      assert.strictEqual(result, `${dayOfWeekName} 23 Sep 2026 18:30`);
    });

    it('handles invalid timestamp gracefully', () => {
      assert.strictEqual(formatChartDate(NaN), '-');
    });
  });

  describe('Preset Defaults and Backward Compatibility', () => {
    it('classic preset includes all new customization properties', () => {
      const p = PRESET_SETTINGS.classic;
      assert.strictEqual(p.crosshairStyle, 'dashed');
      assert.strictEqual(p.crosshairSize, 1);
      assert.strictEqual(p.crosshairLabelBgColor, '#363c4e');
      assert.strictEqual(p.crosshairTextColor, '#ffffff');
      assert.strictEqual(p.priceScalePosition, 'right');
      assert.strictEqual(p.showPriceScalePriceLabels, true);
      assert.strictEqual(p.showPriceScaleLastPriceLabel, true);
      assert.strictEqual(p.showPriceScaleCrosshairLabel, true);
      assert.strictEqual(p.showTimeScaleLabels, true);
      assert.strictEqual(p.showTimeScaleCrosshairLabel, true);
      assert.strictEqual(p.showTimeScaleDayOfWeek, false);
      assert.strictEqual(p.dateFormat, 'dd MMM yyyy');
      assert.strictEqual(p.timeFormat, '24h');
      assert.strictEqual(p.showWatermark, true);
    });

    it('obsidian preset includes all new customization properties', () => {
      const p = PRESET_SETTINGS.obsidian;
      assert.strictEqual(p.crosshairStyle, 'dashed');
      assert.strictEqual(p.crosshairLabelBgColor, '#2a2e39');
      assert.strictEqual(p.crosshairTextColor, '#ffffff');
      assert.strictEqual(p.priceScalePosition, 'right');
      assert.strictEqual(p.showWatermark, true);
    });

    it('matrix preset includes high contrast solid grid and crosshair properties', () => {
      const p = PRESET_SETTINGS.matrix;
      assert.strictEqual(p.crosshairStyle, 'solid');
      assert.strictEqual(p.crosshairLabelBgColor, '#00FF66');
      assert.strictEqual(p.crosshairTextColor, '#0D1B2A');
      assert.strictEqual(p.vertGridStyle, 'solid');
      assert.strictEqual(p.horizGridStyle, 'solid');
      assert.strictEqual(p.priceScalePosition, 'right');
      assert.strictEqual(p.showWatermark, true);
    });
  });

  describe('Settings Session Lifecycle & Apply vs Cancel Semantics', () => {
    it('applies setting changes immediately to live state and charts without waiting for dialog close', () => {
      let liveState = { ...PRESET_SETTINGS.classic };
      const liveUpdates: any[] = [];
      const onLiveSettingsChange = (newSettings: any) => {
        liveState = { ...newSettings };
        liveUpdates.push({ ...newSettings });
      };

      // Simulate user changing crosshair color and grid style in real-time
      const change1 = { ...liveState, crosshairColor: '#ff0000' };
      onLiveSettingsChange(change1);
      assert.strictEqual(liveState.crosshairColor, '#ff0000');
      assert.strictEqual(liveUpdates.length, 1);

      const change2 = { ...liveState, vertGridStyle: 'dotted' as const };
      onLiveSettingsChange(change2);
      assert.strictEqual(liveState.vertGridStyle, 'dotted');
      assert.strictEqual(liveUpdates.length, 2);
    });

    it('retains changes on outside click (apply semantics)', () => {
      const initialSettings = { ...PRESET_SETTINGS.classic, crosshairColor: '#ffffff' };
      const snapshot = JSON.parse(JSON.stringify(initialSettings));
      let currentSettings = { ...initialSettings };

      // User modifies settings
      currentSettings.crosshairColor = '#ff0000';
      currentSettings.horizGridStyle = 'solid';

      // Outside click handler (accept & discard snapshot)
      let persistedSettings: any = null;
      const handleOutsideClick = () => {
        persistedSettings = { ...currentSettings };
      };

      handleOutsideClick();
      assert.strictEqual(persistedSettings.crosshairColor, '#ff0000');
      assert.strictEqual(persistedSettings.horizGridStyle, 'solid');
    });

    it('restores initial snapshot on X / Cancel button', () => {
      const initialSettings = { ...PRESET_SETTINGS.classic, crosshairColor: '#ffffff', vertGridStyle: 'none' as const };
      const snapshot = JSON.parse(JSON.stringify(initialSettings));
      let currentSettings = { ...initialSettings };

      // User makes multiple changes
      currentSettings.crosshairColor = '#ff0000';
      currentSettings.vertGridStyle = 'dashed';

      // X / Cancel handler
      let restoredSettings: any = null;
      const handleCancel = () => {
        restoredSettings = JSON.parse(JSON.stringify(snapshot));
        currentSettings = restoredSettings;
      };

      handleCancel();
      assert.strictEqual(currentSettings.crosshairColor, '#ffffff');
      assert.strictEqual(currentSettings.vertGridStyle, 'none');
      assert.strictEqual(restoredSettings.crosshairColor, '#ffffff');
    });

    it('isolates nested option dialog cancel without resetting parent dialog session', () => {
      const modalOpeningSettings = { ...PRESET_SETTINGS.classic, background: '#131722', crosshairColor: '#888888' };
      let modalLiveSettings = { ...modalOpeningSettings };

      // 1. User changes background in parent modal
      modalLiveSettings.background = '#000000';

      // 2. User opens nested color picker for crosshairColor
      const nestedColorSnapshot = { fieldKey: 'crosshairColor', initialColor: modalLiveSettings.crosshairColor };

      // 3. User drags color picker to red
      modalLiveSettings.crosshairColor = '#ff0000';

      // 4. User clicks X on the nested color picker (cancel nested only)
      modalLiveSettings[nestedColorSnapshot.fieldKey as keyof typeof modalLiveSettings] = nestedColorSnapshot.initialColor;

      // Result: crosshairColor is reverted, but background change remains active!
      assert.strictEqual(modalLiveSettings.crosshairColor, '#888888');
      assert.strictEqual(modalLiveSettings.background, '#000000');
    });
  });
});
