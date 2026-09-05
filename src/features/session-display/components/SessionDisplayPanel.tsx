import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronDown, 
  Globe, 
  Sliders, 
  RotateCcw,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { ColorPicker } from '@/components/ColorPicker';
import { TimePickerInput } from './TimePickerInput';
import { useSettingsStore } from '@/store';
import { settingsRepository } from '@/repository';
import { 
  type SessionId, 
  type SessionConfig, 
  type SessionDisplaySettings, 
  DEFAULT_SESSION_DISPLAY_SETTINGS 
} from '../types';

// Custom ToggleSwitch component matching FX Freeplay visual styling
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  title?: string;
  size?: 'sm' | 'md';
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ 
  checked, 
  onChange, 
  disabled = false, 
  title,
  size = 'md'
}) => {
  const isSm = size === 'sm';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`${isSm ? 'w-7 h-4' : 'w-8 h-4.5'} rounded-full transition-colors duration-200 relative flex-shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
      }`}
    >
      <span
        className={`block ${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} rounded-full bg-txt-inverse transition-transform duration-200 shadow-sm ${
          checked 
            ? (isSm ? 'translate-x-[13px]' : 'translate-x-[15px]') 
            : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
};

// Session Group definitions for accordion sections
interface SessionGroupDef {
  id: string;
  title: string;
  sessionIds: SessionId[];
}

const SESSION_GROUPS: SessionGroupDef[] = [
  {
    id: 'asia',
    title: 'ASIA',
    sessionIds: ['asia', 'sydney', 'tokyo'],
  },
  {
    id: 'frankfurt',
    title: 'FRANKFURT',
    sessionIds: ['frankfurt'],
  },
  {
    id: 'london',
    title: 'LONDON',
    sessionIds: ['london'],
  },
  {
    id: 'newYork',
    title: 'NEW YORK',
    sessionIds: ['newYork'],
  },
  {
    id: 'custom',
    title: 'CUSTOM',
    sessionIds: ['custom'],
  },
];

export const SessionDisplayPanel: React.FC = () => {
  // Global chart settings (for selected timezone and clock format 12h/24h)
  const { settings: chartSettings, setSettings: setChartSettings } = useSettingsStore();

  const activeTimezone = chartSettings.timezoneAdjustmentEnabled 
    ? (chartSettings.userTimezoneLabel || 'UTC')
    : 'Exchange';

  const timeFormat = chartSettings.timeFormat || '24h';
  const is24Hour = timeFormat === '24h';

  const handleToggleTimeFormat = (newFormat: '12h' | '24h') => {
    setChartSettings({ timeFormat: newFormat });
    settingsRepository.saveSettings({ ...chartSettings, timeFormat: newFormat }).catch(console.error);
  };

  // Local state for Step 1 (will connect to Zustand store in Step 2)
  const [settings, setSettings] = useState<SessionDisplaySettings>(DEFAULT_SESSION_DISPLAY_SETTINGS);

  // Collapsible groups state (default all open for easy scanning)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    general: true,
    asia: true,
    frankfurt: true,
    london: true,
    newYork: true,
    custom: true,
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Active color picker popover state: stores sessionId currently being edited
  const [activeColorPickerSessionId, setActiveColorPickerSessionId] = useState<SessionId | null>(null);
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number } | null>(null);

  // Close color picker on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!activeColorPickerSessionId) return;
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // If clicking on another session color button, let that button's onClick toggle or switch it
        const target = e.target as HTMLElement;
        if (target.closest('[data-session-color-button]')) {
          return;
        }
        setActiveColorPickerSessionId(null);
        setPickerPosition(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveColorPickerSessionId(null);
        setPickerPosition(null);
      }
    };

    if (activeColorPickerSessionId) {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeColorPickerSessionId]);

  const handleOpenColorPicker = (sessionId: SessionId, event: React.MouseEvent<HTMLButtonElement>) => {
    if (activeColorPickerSessionId === sessionId) {
      setActiveColorPickerSessionId(null);
      setPickerPosition(null);
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const sidebarEl = panelRef.current?.closest('[data-workspace-sidebar="true"]') || (panelRef.current?.closest('.border-l') as HTMLElement | null);
    const sidebarLeft = sidebarEl ? sidebarEl.getBoundingClientRect().left : (panelRef.current?.getBoundingClientRect().left ?? window.innerWidth - 340);

    const pickerWidth = 560;
    const pickerEstimatedHeight = 440;

    // Position over the chart canvas area, immediately to the left of the sidebar with a 16px gap
    let left = sidebarLeft - pickerWidth - 16;
    if (left < 16) {
      left = 16;
    }

    // Align vertically with the clicked session button, clamped within visible viewport bounds
    let top = buttonRect.top - 20;
    const minTop = 60;
    const maxTop = window.innerHeight - pickerEstimatedHeight - 20;
    top = Math.max(minTop, Math.min(top, maxTop));

    setPickerPosition({ top, left });
    setActiveColorPickerSessionId(sessionId);
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleToggleMaster = (checked: boolean) => {
    if (!checked) {
      setActiveColorPickerSessionId(null);
      setPickerPosition(null);
    }
    setSettings(prev => ({
      ...prev,
      enabled: checked,
    }));
  };

  const handleToggleSession = (id: SessionId, enabled: boolean) => {
    if (!enabled && activeColorPickerSessionId === id) {
      setActiveColorPickerSessionId(null);
      setPickerPosition(null);
    }
    setSettings(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [id]: {
          ...prev.sessions[id],
          enabled,
        },
      },
    }));
  };

  const handleTimeChange = (id: SessionId, field: 'startTime' | 'endTime', value: string) => {
    setSettings(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [id]: {
          ...prev.sessions[id],
          [field]: value,
        },
      },
    }));
  };

  const handleColorChange = (id: SessionId, color: string) => {
    setSettings(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [id]: {
          ...prev.sessions[id],
          color,
        },
      },
    }));
  };

  const customCount = settings.customSessionCount ?? 1;

  const handleAddCustomSession = () => {
    if (customCount >= 3) return;
    const nextCount = customCount + 1;
    const nextSlotId: SessionId = nextCount === 2 ? 'custom2' : 'custom3';

    // Ensure the custom group is open so the user sees the newly added card immediately
    setOpenGroups(prev => ({ ...prev, custom: true }));

    setSettings(prev => {
      const currentSessions = prev.sessions || DEFAULT_SESSION_DISPLAY_SETTINGS.sessions;
      return {
        ...prev,
        customSessionCount: nextCount,
        sessions: {
          ...currentSessions,
          custom: currentSessions.custom ?? DEFAULT_SESSION_DISPLAY_SETTINGS.sessions.custom,
          custom2: currentSessions.custom2 ?? DEFAULT_SESSION_DISPLAY_SETTINGS.sessions.custom2,
          custom3: currentSessions.custom3 ?? DEFAULT_SESSION_DISPLAY_SETTINGS.sessions.custom3,
          [nextSlotId]: {
            ...(currentSessions[nextSlotId] ?? DEFAULT_SESSION_DISPLAY_SETTINGS.sessions[nextSlotId]),
            enabled: true, // Auto-enable when added so it's immediately active and visible
          },
        },
      };
    });
  };

  const handleRemoveCustomSession = (idToRemove: SessionId) => {
    if (customCount <= 1) return;
    if (activeColorPickerSessionId === idToRemove) {
      setActiveColorPickerSessionId(null);
      setPickerPosition(null);
    }

    setSettings(prev => {
      const ids: SessionId[] = ['custom', 'custom2', 'custom3'];
      const currentSessions = prev.sessions || DEFAULT_SESSION_DISPLAY_SETTINGS.sessions;

      const currentList: SessionConfig[] = [];
      for (let i = 0; i < (prev.customSessionCount ?? 1); i++) {
        const sid = ids[i];
        const s = currentSessions[sid] ?? DEFAULT_SESSION_DISPLAY_SETTINGS.sessions[sid];
        currentList.push({ ...s });
      }

      // Filter out the session being removed
      const remainingList = currentList.filter(s => s.id !== idToRemove);
      const nextCount = remainingList.length;

      // Re-assign remaining sessions sequentially into custom, custom2, custom3 slots
      const updatedSessions = { ...currentSessions };
      for (let i = 0; i < 3; i++) {
        const slotId = ids[i];
        const defaultSlot = DEFAULT_SESSION_DISPLAY_SETTINGS.sessions[slotId];
        if (i < remainingList.length) {
          updatedSessions[slotId] = {
            ...remainingList[i],
            id: slotId,
            name: `Custom ${i + 1}`,
          };
        } else {
          updatedSessions[slotId] = {
            ...defaultSlot,
            enabled: false,
          };
        }
      }

      return {
        ...prev,
        customSessionCount: nextCount,
        sessions: updatedSessions,
      };
    });
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SESSION_DISPLAY_SETTINGS);
    setActiveColorPickerSessionId(null);
    setPickerPosition(null);
  };

  // Render an individual session configuration row
  // Render an individual session configuration row
  const renderSessionRow = (session: SessionConfig, onDelete?: () => void) => {
    const isMasterOff = !settings.enabled;
    const isSessionDisabled = isMasterOff || !session.enabled;

    return (
      <div 
        key={session.id}
        className={`flex flex-col gap-2 p-2.5 rounded-lg border transition-all ${
          session.enabled && !isMasterOff
            ? 'bg-surface-elevated/40 border-border-sub' 
            : 'bg-surface/30 border-transparent opacity-60'
        }`}
      >
        {/* Session Header: Toggle, Name, Color Swatch, and optional Delete */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ToggleSwitch
              checked={session.enabled}
              disabled={isMasterOff}
              size="sm"
              onChange={(checked) => handleToggleSession(session.id, checked)}
              title={`Enable ${session.name} session`}
            />
            <span className="text-xs font-semibold text-txt-primary truncate">
              {session.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Optional Delete button for custom sessions (when > 1 custom session) */}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                title={`Remove ${session.name}`}
                className="p-1 rounded text-txt-muted hover:text-status-error hover:bg-status-error/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Color Trigger Button */}
            <button
              type="button"
              data-session-color-button="true"
              disabled={isSessionDisabled}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenColorPicker(session.id, e);
              }}
              className={`w-6 h-6 rounded-md border shadow-xs cursor-pointer transition-all flex items-center justify-center flex-shrink-0 overflow-hidden relative disabled:opacity-40 disabled:cursor-not-allowed ${
                activeColorPickerSessionId === session.id
                  ? 'ring-2 ring-accent border-accent scale-105'
                  : 'border-border-def hover:border-txt-muted'
              }`}
              style={{
                background: 'repeating-conic-gradient(#3a3f4d 0% 25%, #232731 0% 50%) 50% / 6px 6px',
              }}
              title={`Change ${session.name} color`}
            >
              <div 
                className="w-full h-full" 
                style={{ backgroundColor: session.color }} 
              />
            </button>
          </div>
        </div>

        {/* Time Range Selector Row matching user's reference */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5 border-t border-border-sub/40">
          <TimePickerInput
            value={session.startTime}
            disabled={isSessionDisabled}
            timeFormat={timeFormat}
            onChange={(val) => handleTimeChange(session.id, 'startTime', val)}
            className="flex-1"
          />
          <span className="text-txt-muted text-xs font-semibold select-none flex-shrink-0">–</span>
          <TimePickerInput
            value={session.endTime}
            disabled={isSessionDisabled}
            timeFormat={timeFormat}
            onChange={(val) => handleTimeChange(session.id, 'endTime', val)}
            className="flex-1"
          />
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={panelRef}
      className="flex-1 h-full flex flex-col min-w-0 bg-surface text-txt-primary select-none overflow-hidden font-sans"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-sub flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sliders className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <span className="text-xs font-bold uppercase tracking-widest text-txt-primary truncate">
            Session Display
          </span>
        </div>
        <button
          type="button"
          onClick={handleResetDefaults}
          title="Reset to default settings"
          className="p-1 rounded text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 scrollbar-thin">
        {/* ─── GENERAL SECTION ─── */}
        <div className="flex flex-col gap-2 pb-2 border-b border-border-sub">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">
              General
            </span>
          </div>

          {/* Master Toggle */}
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-surface-elevated/40 border border-border-sub">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-txt-primary">Session Display</span>
              <span className="text-[10px] text-txt-muted">Master visibility switch</span>
            </div>
            <ToggleSwitch
              checked={settings.enabled}
              onChange={handleToggleMaster}
              title="Toggle all session displays"
            />
          </div>

          {/* Timezone Indicator */}
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-surface-elevated/20 border border-border-sub/60 text-xs">
            <div className="flex items-center gap-1.5 text-txt-muted flex-shrink-0">
              <Globe className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              <span className="font-medium">Timezone</span>
            </div>
            <span 
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-accent-muted text-accent border border-accent/25 truncate max-w-[170px]"
              title={activeTimezone}
            >
              {activeTimezone}
            </span>
          </div>

          {/* 24-Hour / 12-Hour Clock Toggle */}
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-surface-elevated/20 border border-border-sub/60 text-xs">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="font-semibold text-txt-primary">24-Hour Clock</span>
              <span className="text-[10px] text-txt-muted truncate">
                {is24Hour ? '24h format (e.g. 18:00)' : '12h format (e.g. 06:00 PM)'}
              </span>
            </div>
            <ToggleSwitch
              checked={is24Hour}
              onChange={(checked) => handleToggleTimeFormat(checked ? '24h' : '12h')}
              title="Toggle between 24-hour and 12-hour clock format"
            />
          </div>
        </div>

        {/* ─── SESSION GROUPS ─── */}
        {SESSION_GROUPS.map((group) => {
          const isOpen = openGroups[group.id] ?? true;

          // For custom group, dynamically resolve sessions according to customCount (up to 3)
          const isCustomGroup = group.id === 'custom';
          const customIds: SessionId[] = (['custom', 'custom2', 'custom3'] as SessionId[]).slice(0, customCount);
          const activeSessionIds = isCustomGroup ? customIds : group.sessionIds;

          const groupSessions = activeSessionIds.map(id => {
            return settings.sessions[id] ?? DEFAULT_SESSION_DISPLAY_SETTINGS.sessions[id];
          }).filter(Boolean);
          const enabledCount = groupSessions.filter(s => s.enabled).length;

          return (
            <div 
              key={group.id}
              className="flex flex-col rounded-xl border border-border-sub bg-surface overflow-hidden transition-colors"
            >
              {/* Accordion Group Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-surface hover:bg-surface-hover transition-colors text-left">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex-1 flex items-center justify-between cursor-pointer py-0.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-txt-primary tracking-wide">
                      {group.title}
                    </span>
                    {enabledCount > 0 && settings.enabled && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-accent-muted text-accent border border-accent/30">
                        {enabledCount}
                      </span>
                    )}
                  </div>
                  <ChevronDown 
                    className={`w-3.5 h-3.5 text-txt-muted transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-txt-primary' : ''
                    }`} 
                  />
                </button>
              </div>

              {/* Accordion Body */}
              {isOpen && (
                <div className="p-2.5 pt-1 flex flex-col gap-2 bg-surface/50 border-t border-border-sub/40">
                  {groupSessions.map((session) => {
                    const isCustomSession = session.id.startsWith('custom');
                    const canDelete = isCustomSession && customCount > 1;
                    return renderSessionRow(
                      session, 
                      canDelete ? () => handleRemoveCustomSession(session.id) : undefined
                    );
                  })}

                  {/* Add button inside custom accordion body if customCount < 3 */}
                  {isCustomGroup && customCount < 3 && (
                    <button
                      type="button"
                      onClick={handleAddCustomSession}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-dashed border-border-def text-xs font-semibold text-txt-muted hover:text-accent hover:border-accent hover:bg-accent-muted/20 transition-all cursor-pointer"
                      title="Add another custom session timing (up to 3)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Custom Session ({customCount}/3)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Floating Color Picker rendered via Portal over Chart Canvas Area */}
      {activeColorPickerSessionId && pickerPosition && settings.sessions[activeColorPickerSessionId] && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${pickerPosition.top}px`,
            left: `${pickerPosition.left}px`,
            zIndex: 9999,
            width: '560px',
          }}
          className="flex flex-col animate-in fade-in zoom-in-95 duration-150 shadow-2xl rounded-xl border border-border-def bg-surface overflow-hidden filter drop-shadow-2xl"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-border-sub bg-surface-elevated/80">
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full border border-border-def shadow-xs flex-shrink-0" 
                style={{ backgroundColor: settings.sessions[activeColorPickerSessionId].color }} 
              />
              <span className="text-xs font-bold text-txt-primary">
                {settings.sessions[activeColorPickerSessionId].name} Session Color
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveColorPickerSessionId(null);
                setPickerPosition(null);
              }}
              className="p-1 text-txt-muted hover:text-txt-primary hover:bg-surface rounded transition-colors cursor-pointer"
              title="Close Color Picker"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Embedded ColorPicker component */}
          <div className="session-color-picker-portal">
            <style>{`
              .session-color-picker-portal > div {
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                background: transparent !important;
              }
            `}</style>
            <ColorPicker
              color={settings.sessions[activeColorPickerSessionId].color}
              onChange={(newColor) => handleColorChange(activeColorPickerSessionId, newColor)}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
