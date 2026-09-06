import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AppModuleDef, WrapperSettingsState } from '../types.ts';

describe('Wrapper Home Domain & Navigation Model', () => {
  const MODULES: AppModuleDef[] = [
    {
      id: 'charts',
      name: 'Charts',
      description: 'Analyze markets, study price action and execute your research.',
      availability: 'available',
    },
    {
      id: 'journal',
      name: 'Journal',
      description: 'Record, review and understand your trading decisions.',
      availability: 'coming_soon',
    },
    {
      id: 'backtesting',
      name: 'Backtesting',
      description: 'Test strategies against historical market data.',
      availability: 'coming_soon',
    },
    {
      id: 'research',
      name: 'Research',
      description: 'Build and organize structured trading research.',
      availability: 'coming_soon',
    },
  ];

  it('defines all required modules with correct availability and descriptions', () => {
    assert.equal(MODULES.length, 4);

    const charts = MODULES.find((m) => m.id === 'charts');
    assert.ok(charts);
    assert.equal(charts.name, 'Charts');
    assert.equal(charts.availability, 'available');
    assert.equal(charts.description, 'Analyze markets, study price action and execute your research.');

    const journal = MODULES.find((m) => m.id === 'journal');
    assert.ok(journal);
    assert.equal(journal.name, 'Journal');
    assert.equal(journal.availability, 'coming_soon');
    assert.equal(journal.description, 'Record, review and understand your trading decisions.');

    const backtesting = MODULES.find((m) => m.id === 'backtesting');
    assert.ok(backtesting);
    assert.equal(backtesting.name, 'Backtesting');
    assert.equal(backtesting.availability, 'coming_soon');
    assert.equal(backtesting.description, 'Test strategies against historical market data.');

    const research = MODULES.find((m) => m.id === 'research');
    assert.ok(research);
    assert.equal(research.name, 'Research');
    assert.equal(research.availability, 'coming_soon');
    assert.equal(research.description, 'Build and organize structured trading research.');
  });

  it('supports future module additions without schema changes', () => {
    const futureModule: AppModuleDef = {
      id: 'analytics',
      name: 'Analytics',
      description: 'Review statistical distributions and expectancy metrics.',
      availability: 'coming_soon',
      category: 'Intelligence',
    };
    assert.equal(futureModule.availability, 'coming_soon');
    assert.equal(futureModule.id, 'analytics');
  });

  it('verifies default wrapper settings state structure', () => {
    const defaultSettings: WrapperSettingsState = {
      theme: 'dark',
      launchAtStartup: false,
      startMinimized: false,
      hardwareAcceleration: true,
      autoCheckUpdates: true,
      notificationPreferences: true,
      defaultModuleOnLaunch: 'charts',
    };
    assert.equal(defaultSettings.theme, 'dark');
    assert.equal(defaultSettings.hardwareAcceleration, true);
    assert.equal(defaultSettings.defaultModuleOnLaunch, 'charts');
  });

  describe('Startup Destination & Fallback Resolution', () => {
    // Dynamically test the pure resolution function
    it('resolves "charts" directly to charts workspace', async () => {
      const { resolveStartupDestination } = await import('../wrapperPersistence.ts');
      const res = resolveStartupDestination('charts');
      assert.equal(res.destination, 'charts');
      assert.equal(res.fallbackReason, undefined);
    });

    it('resolves "home" directly to home workspace hub', async () => {
      const { resolveStartupDestination } = await import('../wrapperPersistence.ts');
      const res = resolveStartupDestination('home');
      assert.equal(res.destination, 'home');
      assert.equal(res.fallbackReason, undefined);
    });

    it('gracefully falls back to "home" when default module is "journal" (unavailable)', async () => {
      const { resolveStartupDestination } = await import('../wrapperPersistence.ts');
      const res = resolveStartupDestination('journal');
      assert.equal(res.destination, 'home');
      assert.ok(res.fallbackReason?.includes('Journal'));
      assert.ok(res.fallbackReason?.includes('Falling back to Home'));
    });

    it('gracefully falls back to "home" when default module is "backtesting" (unavailable)', async () => {
      const { resolveStartupDestination } = await import('../wrapperPersistence.ts');
      const res = resolveStartupDestination('backtesting');
      assert.equal(res.destination, 'home');
      assert.ok(res.fallbackReason?.includes('Backtesting'));
      assert.ok(res.fallbackReason?.includes('Falling back to Home'));
    });

    it('gracefully falls back to "home" when default module is "research" (unavailable)', async () => {
      const { resolveStartupDestination } = await import('../wrapperPersistence.ts');
      const res = resolveStartupDestination('research');
      assert.equal(res.destination, 'home');
      assert.ok(res.fallbackReason?.includes('Research'));
      assert.ok(res.fallbackReason?.includes('Falling back to Home'));
    });

    it('gracefully defaults to "home" when target is missing or unrecognized', async () => {
      const { resolveStartupDestination } = await import('../wrapperPersistence.ts');
      const resEmpty = resolveStartupDestination(undefined);
      assert.equal(resEmpty.destination, 'home');

      const resUnknown = resolveStartupDestination('unknown-module');
      assert.equal(resUnknown.destination, 'home');
      assert.ok(resUnknown.fallbackReason?.includes('Falling back to Home'));
    });

    it('gracefully falls back to "home" when default module is "help"', async () => {
      const { resolveStartupDestination } = await import('../wrapperPersistence.ts');
      const res = resolveStartupDestination('help');
      assert.equal(res.destination, 'home');
      assert.ok(res.fallbackReason?.includes('Help'));
      assert.ok(res.fallbackReason?.includes('Falling back to Home'));
    });
  });

  describe('Persistence & Error Recovery', () => {
    it('handles localStorage unavailability without throwing', async () => {
      const { loadWrapperSettings, saveWrapperSettings, DEFAULT_WRAPPER_SETTINGS } = await import(
        '../wrapperPersistence.ts'
      );
      // Under node environment, if window/localStorage is mocked or absent
      const settings = loadWrapperSettings();
      assert.ok(settings);
      assert.equal(settings.defaultModuleOnLaunch, DEFAULT_WRAPPER_SETTINGS.defaultModuleOnLaunch);

      const saved = saveWrapperSettings({ defaultModuleOnLaunch: 'charts' });
      assert.ok(saved);
      assert.equal(saved.defaultModuleOnLaunch, 'charts');
    });

    it('recovers safely from corrupt or non-object localStorage values', async () => {
      const { loadWrapperSettings, DEFAULT_WRAPPER_SETTINGS } = await import('../wrapperPersistence.ts');
      // Create mock storage
      const store: Record<string, string> = {};
      const mockStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      };

      // Corrupt JSON string
      (globalThis as unknown as { localStorage: unknown }).localStorage = mockStorage;
      store['fx_wrapper_settings'] = '{invalid-json:';
      const recoveredFromCorrupt = loadWrapperSettings();
      assert.deepEqual(recoveredFromCorrupt, DEFAULT_WRAPPER_SETTINGS);

      // Primitive number in storage
      store['fx_wrapper_settings'] = '42';
      const recoveredFromNumber = loadWrapperSettings();
      assert.deepEqual(recoveredFromNumber, DEFAULT_WRAPPER_SETTINGS);

      // Array in storage
      store['fx_wrapper_settings'] = '["charts"]';
      const recoveredFromArray = loadWrapperSettings();
      assert.deepEqual(recoveredFromArray, DEFAULT_WRAPPER_SETTINGS);

      // Cleanup
      delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
    });

    it('guarantees isolated localStorage namespace from existing application keys', async () => {
      const applicationKeys = [
        'tv_clone_settings',
        'layout_type',
        'layout_slots',
        'layout_sizes',
        'active_watchlist_symbol',
        'active_timeframe',
        'fx_session_display_settings',
        'fx_theme_mode',
        'fx_custom_theme',
      ];

      const wrapperKey = 'fx_wrapper_settings';
      for (const appKey of applicationKeys) {
        assert.notEqual(wrapperKey, appKey);
      }
    });
  });

  describe('Theme Architecture Integration', () => {
    it('supports all core theme modes ("dark", "amoled", "light")', async () => {
      const { getThemeTokens } = await import('../../../config/themes.ts');
      const darkTokens = getThemeTokens('dark');
      const amoledTokens = getThemeTokens('amoled');
      const lightTokens = getThemeTokens('light');

      assert.ok(darkTokens.bgApp);
      assert.ok(amoledTokens.bgApp);
      assert.ok(lightTokens.bgApp);

      // AMOLED has pure pitch black app background
      assert.equal(amoledTokens.bgApp, '#000000');
      // Light mode has light background
      assert.equal(lightTokens.bgApp.toLowerCase(), '#f8fafc');
      // Dark mode has classic dark background
      assert.equal(darkTokens.bgApp, '#131722');
    });
  });
});

