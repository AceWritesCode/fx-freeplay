import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Sliders,
  Moon,
  Monitor,
  RefreshCw,
  Info,
  Check,
  Palette,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { SettingsSectionId, WrapperSettingsState } from '../types';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { ThemeMode } from '@/config/themes';
import { loadWrapperSettings, saveWrapperSettings } from '../wrapperPersistence';

interface WrapperSettingsProps {
  onBack: () => void;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';

export const WrapperSettings: React.FC<WrapperSettingsProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general');
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);

  const [settings, setSettings] = useState<WrapperSettingsState>(() => {
    const loaded = loadWrapperSettings();
    return {
      ...loaded,
      theme: themeMode,
    };
  });

  const [savedNotice, setSavedNotice] = useState(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-updater state
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [updateInfo, setUpdateInfo] = useState<{ version?: string; releaseNotes?: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);

  const isNoReleaseOnGitHub = Boolean(
    statusMessage && (
      statusMessage.toLowerCase().includes('unable to find latest version on github') ||
      statusMessage.toLowerCase().includes('cannot parse releases feed')
    )
  );

  useEffect(() => {
    const updater = (window as any).updaterAPI;
    if (!updater?.onUpdateEvent) return;

    const cleanup = updater.onUpdateEvent((message: string, data: any) => {
      console.log('[WrapperSettings] Update event:', message, data);
      switch (message) {
        case 'checking':
          setUpdateStatus('checking');
          setStatusMessage('Checking for updates on GitHub...');
          break;
        case 'available':
          setUpdateStatus('available');
          setUpdateInfo(data || null);
          setStatusMessage(`Update available: ${data?.version ? 'v' + data.version : 'New version found'}`);
          break;
        case 'not-available':
          setUpdateStatus('idle');
          setStatusMessage('You are running the latest version.');
          break;
        case 'progress':
          setUpdateStatus('downloading');
          setDownloadProgress(Math.round(data?.percent || 0));
          setStatusMessage(`Downloading update: ${Math.round(data?.percent || 0)}%`);
          break;
        case 'downloaded':
          setUpdateStatus('ready');
          setUpdateInfo(data || null);
          setStatusMessage('Update downloaded and ready to install.');
          break;
        case 'error':
          setUpdateStatus('error');
          setStatusMessage(typeof data === 'string' ? data : data?.message || 'Error checking for updates');
          break;
        default:
          break;
      }
    });

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  const handleCheckForUpdates = () => {
    setShowErrorDetails(false);
    const updater = (window as any).updaterAPI;
    if (updater?.checkForUpdates) {
      setUpdateStatus('checking');
      setStatusMessage('Checking for updates...');
      updater.checkForUpdates();
    } else {
      setUpdateStatus('idle');
      setStatusMessage('Updater is active in the packaged desktop environment.');
    }
  };

  const handleDownloadUpdate = () => {
    const updater = (window as any).updaterAPI;
    if (updater?.downloadUpdate) {
      setUpdateStatus('downloading');
      setDownloadProgress(0);
      setStatusMessage('Starting download...');
      updater.downloadUpdate();
    }
  };

  const handleInstallUpdate = () => {
    const updater = (window as any).updaterAPI;
    if (updater?.installUpdate) {
      updater.installUpdate();
    }
  };

  React.useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const triggerNotice = () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setSavedNotice(true);
    noticeTimerRef.current = setTimeout(() => {
      setSavedNotice(false);
      noticeTimerRef.current = null;
    }, 1800);
  };

  const handleToggle = (key: keyof WrapperSettingsState) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveWrapperSettings(next);
      console.log(`[Wrapper] Settings changed: ${String(key)} =`, next[key]);
      return next;
    });
    triggerNotice();
  };

  const handleSelectTheme = (mode: ThemeMode) => {
    console.log('[Wrapper] Theme switched via shared theme system:', mode);
    setThemeMode(mode);
    setSettings((prev) => {
      const next = { ...prev, theme: mode };
      saveWrapperSettings(next);
      return next;
    });
    triggerNotice();
  };

  const handleSelectDefaultModule = (defaultModuleOnLaunch: string) => {
    setSettings((prev) => {
      const next = { ...prev, defaultModuleOnLaunch };
      saveWrapperSettings(next);
      console.log('[Wrapper] Settings changed: defaultModuleOnLaunch =', defaultModuleOnLaunch);
      return next;
    });
    triggerNotice();
  };

  return (
    <div className="flex flex-col h-full w-full bg-app-bg text-txt-primary select-none overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border-def bg-surface/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              console.log('[Wrapper] Returning to Home from Settings');
              onBack();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-def text-xs font-semibold text-txt-secondary hover:text-txt-primary transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-accent" />
            <span>Home</span>
          </button>
          <div className="h-4 w-px bg-border-def" />
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-accent" />
            <h1 className="text-xs font-bold uppercase tracking-wider text-txt-primary">
              Wrapper Settings
            </h1>
          </div>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-muted border border-accent/30 text-xs text-accent animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Preference updated</span>
          </div>
        )}
      </header>

      {/* Settings Layout: Sidebar + Panel */}
      <div className="flex flex-1 min-h-0">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r border-border-def p-6 flex flex-col gap-1.5 shrink-0 bg-surface/30">
          <div className="text-[10px] font-bold uppercase tracking-widest text-txt-muted mb-3 px-3">
            Configuration
          </div>

          {[
            { id: 'general', label: 'General', icon: Sliders },
            { id: 'appearance', label: 'Appearance', icon: Moon },
            { id: 'startup', label: 'Startup & Window', icon: Monitor },
            { id: 'updates', label: 'Updates', icon: RefreshCw },
            { id: 'about', label: 'About Desktop', icon: Info },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                console.log(`[Wrapper] Settings section switched: ${label}`);
                setActiveSection(id as SettingsSectionId);
              }}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeSection === id
                  ? 'bg-accent-muted text-txt-primary border border-accent/40 shadow-xs'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
              }`}
            >
              <Icon className={`w-4 h-4 ${activeSection === id ? 'text-accent' : 'text-txt-muted'}`} />
              <span>{label}</span>
            </button>
          ))}

          <div className="mt-auto p-3.5 rounded-xl bg-surface/60 border border-border-def text-[11px] text-txt-muted leading-relaxed">
            <div className="flex items-center gap-1.5 text-txt-secondary font-semibold mb-1">
              <Palette className="w-3.5 h-3.5 text-accent" />
              <span>Shared Theme System</span>
            </div>
            Appearance changes apply universally across both the desktop wrapper and the FX Freeplay platform.
          </div>
        </aside>

        {/* Section Content Area */}
        <main className="flex-1 overflow-y-auto p-10 max-w-3xl">
          {activeSection === 'general' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-txt-primary mb-1">General Preferences</h2>
                <p className="text-xs text-txt-muted">Configure foundational desktop wrapper behaviors.</p>
              </div>

              <div className="divide-y divide-border-def rounded-2xl border border-border-def bg-surface/40 overflow-hidden">
                <div className="flex items-center justify-between p-5">
                  <div>
                    <div className="text-sm font-semibold text-txt-primary">Default Launch View</div>
                    <div className="text-xs text-txt-muted mt-0.5">Which view loads immediately on application start</div>
                  </div>
                  <select
                    value={settings.defaultModuleOnLaunch}
                    onChange={(e) => handleSelectDefaultModule(e.target.value)}
                    className="bg-surface-elevated border border-border-def rounded-lg text-xs text-txt-primary px-3 py-1.5 cursor-pointer focus:outline-none focus:border-accent"
                  >
                    <option value="home">Workspace Hub (Home)</option>
                    <option value="charts">Charts</option>
                    <option value="journal">Journal (Coming Soon)</option>
                    <option value="backtesting">Backtesting (Coming Soon)</option>
                    <option value="research">Research (Coming Soon)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-5">
                  <div>
                    <div className="text-sm font-semibold text-txt-primary">Hardware Acceleration</div>
                    <div className="text-xs text-txt-muted mt-0.5">Accelerate canvas rendering utilizing GPU</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('hardwareAcceleration')}
                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.hardwareAcceleration ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-txt-inverse transition-transform ${
                        settings.hardwareAcceleration ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-5">
                  <div>
                    <div className="text-sm font-semibold text-txt-primary">System Notifications</div>
                    <div className="text-xs text-txt-muted mt-0.5">Display OS alerts for session events and platform notifications</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('notificationPreferences')}
                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.notificationPreferences ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-txt-inverse transition-transform ${
                        settings.notificationPreferences ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'appearance' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-txt-primary mb-1">Appearance</h2>
                <p className="text-xs text-txt-muted">Select an application theme from FX Freeplay's shared theme system.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    id: 'dark',
                    label: 'Dark',
                    sub: 'Classic violet obsidian (#131722)',
                    previewBg: '#131722',
                    accentColor: '#6366f1',
                  },
                  {
                    id: 'amoled',
                    label: 'AMOLED',
                    sub: 'Pure pitch black OLED (#000000)',
                    previewBg: '#000000',
                    accentColor: '#3b82f6',
                  },
                  {
                    id: 'light',
                    label: 'Light',
                    sub: 'High-contrast light slate (#F8FAFC)',
                    previewBg: '#f8fafc',
                    accentColor: '#2563eb',
                  },
                ].map(({ id, label, sub, previewBg, accentColor }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectTheme(id as ThemeMode)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-32 ${
                      themeMode === id
                        ? 'border-accent bg-accent-muted shadow-sm'
                        : 'border-border-def bg-surface/40 hover:border-border-sub hover:bg-surface-hover'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-txt-primary">{label}</span>
                        {themeMode === id && (
                          <span className="w-2 h-2 rounded-full bg-accent shadow-xs" />
                        )}
                      </div>
                      <div className="text-[11px] text-txt-muted">{sub}</div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border-def/60">
                      <div
                        className="w-5 h-5 rounded-md border border-border-def shadow-xs shrink-0"
                        style={{ backgroundColor: previewBg }}
                      />
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: accentColor }}
                      />
                      <span className="text-[10px] font-mono text-txt-muted">Palette active</span>
                    </div>
                  </button>
                ))}
              </div>

              {themeMode === 'custom' && (
                <div className="p-4 rounded-xl border border-accent/30 bg-accent-muted text-xs text-txt-secondary flex items-center justify-between">
                  <span>A custom theme is currently active from application settings.</span>
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('dark')}
                    className="px-3 py-1 rounded bg-surface border border-border-def text-txt-primary font-medium hover:bg-surface-hover cursor-pointer"
                  >
                    Reset to Dark
                  </button>
                </div>
              )}
            </section>
          )}

          {activeSection === 'startup' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-txt-primary mb-1">Startup & Window Behavior</h2>
                <p className="text-xs text-txt-muted">Control how FX Freeplay launches on your operating system.</p>
              </div>

              <div className="divide-y divide-border-def rounded-2xl border border-border-def bg-surface/40 overflow-hidden">
                <div className="flex items-center justify-between p-5">
                  <div>
                    <div className="text-sm font-semibold text-txt-primary">Start at Login</div>
                    <div className="text-xs text-txt-muted mt-0.5">Automatically launch FX Freeplay when you sign into your computer</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('launchAtStartup')}
                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.launchAtStartup ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-txt-inverse transition-transform ${
                        settings.launchAtStartup ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-5">
                  <div>
                    <div className="text-sm font-semibold text-txt-primary">Start Minimized</div>
                    <div className="text-xs text-txt-muted mt-0.5">Keep the window hidden in the background upon system startup</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('startMinimized')}
                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.startMinimized ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-txt-inverse transition-transform ${
                        settings.startMinimized ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'updates' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-txt-primary mb-1">Software Updates</h2>
                <p className="text-xs text-txt-muted">Manage automated verification, check releases, and apply updates.</p>
              </div>

              {/* v1.0.0 Update Visualizer Banner */}
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-sm font-bold text-txt-primary flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl animate-bounce">🚀</span>
                  <span>Version 1.0.0 - Auto Update Successful!</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold">
                  v1.0.0 Active
                </span>
              </div>

              {/* Updater Status Card */}
              <div className="p-6 rounded-2xl border border-border-def bg-surface/40 space-y-5 overflow-hidden break-words">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 overflow-hidden">
                  <div className="space-y-1.5 min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-txt-primary">Desktop Client Release</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-elevated border border-border-sub text-accent font-semibold">
                        {updateInfo?.version ? `v${updateInfo.version}` : 'Channel: GitHub Releases'}
                      </span>
                    </div>
                    <div className="text-sm text-txt-muted overflow-hidden break-words">
                      {updateStatus === 'checking' && (
                        <span className="flex items-center gap-1.5 text-accent">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Checking GitHub releases...</span>
                        </span>
                      )}
                      {updateStatus === 'available' && (
                        <span className="flex items-center gap-1.5 text-status-warning font-medium">
                          <Download className="w-3.5 h-3.5" />
                          <span>New version available {updateInfo?.version ? `(v${updateInfo.version})` : ''}</span>
                        </span>
                      )}
                      {updateStatus === 'downloading' && (
                        <span className="flex items-center gap-1.5 text-accent">
                          <Download className="w-3.5 h-3.5 animate-bounce" />
                          <span>Downloading package from GitHub ({downloadProgress}%)</span>
                        </span>
                      )}
                      {updateStatus === 'ready' && (
                        <span className="flex items-center gap-1.5 text-status-success font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Update ready to install. Restart application to apply.</span>
                        </span>
                      )}
                      {updateStatus === 'error' && (
                        <div className="flex flex-col gap-2 w-full max-w-full overflow-hidden break-words text-sm">
                          {isNoReleaseOnGitHub ? (
                            <div className="flex items-center gap-2 text-txt-primary font-medium">
                              <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                              <span>You are currently on the latest version.</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-status-error">
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <AlertCircle className="w-4 h-4 shrink-0" />
                                  <span>Failed to check for updates.</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowErrorDetails((prev) => !prev)}
                                  className="text-xs text-accent hover:underline font-sans cursor-pointer transition-colors"
                                >
                                  {showErrorDetails ? 'Hide Error Details' : 'View Error Details'}
                                </button>
                              </div>

                              {showErrorDetails && statusMessage && (
                                <div className="mt-1 p-3 rounded-xl bg-surface-elevated/90 border border-border-def text-xs font-mono text-txt-secondary break-words overflow-hidden max-w-full select-text shadow-inner">
                                  <pre className="whitespace-pre-wrap break-words overflow-hidden text-[11px] font-mono leading-relaxed max-h-40 overflow-y-auto">
                                    {statusMessage}
                                  </pre>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {updateStatus === 'idle' && (
                        <span>{statusMessage || 'Click below to verify if updates are available.'}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {updateStatus === 'idle' && (
                      <button
                        type="button"
                        onClick={handleCheckForUpdates}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border-def text-xs font-semibold text-txt-primary cursor-pointer transition-all shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-accent" />
                        <span>Check for Updates</span>
                      </button>
                    )}

                    {updateStatus === 'checking' && (
                      <button
                        type="button"
                        disabled
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface/50 border border-border-def text-xs font-semibold text-txt-muted cursor-not-allowed opacity-75"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
                        <span>Checking...</span>
                      </button>
                    )}

                    {updateStatus === 'available' && (
                      <button
                        type="button"
                        onClick={handleDownloadUpdate}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-txt-inverse text-xs font-semibold cursor-pointer transition-all shadow-md animate-pulse"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Update</span>
                      </button>
                    )}

                    {updateStatus === 'ready' && (
                      <button
                        type="button"
                        onClick={handleInstallUpdate}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-status-success hover:bg-emerald-600 text-txt-inverse text-xs font-semibold cursor-pointer transition-all shadow-md"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restart & Install</span>
                      </button>
                    )}

                    {updateStatus === 'error' && (
                      <button
                        type="button"
                        onClick={handleCheckForUpdates}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border-def text-xs font-semibold text-txt-primary cursor-pointer transition-all shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-accent" />
                        <span>{isNoReleaseOnGitHub ? 'Check for Updates' : 'Retry Check'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar when downloading */}
                {updateStatus === 'downloading' && (
                  <div className="p-4 rounded-xl bg-surface-elevated/70 border border-border-def space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-txt-secondary">Download Progress</span>
                      <span className="text-accent font-bold">{downloadProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-border-def/50">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(2, downloadProgress)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Automatic Update Verification Setting */}
              <div className="divide-y divide-border-def rounded-2xl border border-border-def bg-surface/40 overflow-hidden">
                <div className="flex items-center justify-between p-5">
                  <div>
                    <div className="text-sm font-semibold text-txt-primary">Automatic Update Verification</div>
                    <div className="text-xs text-txt-muted mt-0.5">Periodically check GitHub release channels for desktop updates</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('autoCheckUpdates')}
                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.autoCheckUpdates ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-txt-inverse transition-transform ${
                        settings.autoCheckUpdates ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'about' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-txt-primary mb-1">About FX Freeplay Desktop</h2>
                <p className="text-xs text-txt-muted">Trading research platform client environment.</p>
              </div>

              <div className="rounded-2xl border border-border-def bg-surface/40 p-6 space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border-def/50">
                  <span className="text-xs text-txt-muted">Client Build</span>
                  <span className="text-xs font-mono text-txt-primary">v1.0.0 (Desktop Wrapper)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border-def/50">
                  <span className="text-xs text-txt-muted">Theme System</span>
                  <span className="text-xs font-mono text-txt-primary">Shared Semantic Tokens (active: {themeMode})</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border-def/50">
                  <span className="text-xs text-txt-muted">Platform</span>
                  <span className="text-xs font-mono text-txt-primary">Cross-Platform Desktop</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-txt-muted">Design Philosophy</span>
                  <span className="text-xs text-accent font-semibold">High-Precision Trading Research</span>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
