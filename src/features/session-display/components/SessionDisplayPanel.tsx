import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Clock, 
  Globe, 
  Sliders, 
  RotateCcw
} from 'lucide-react';
import { ColorPicker } from '@/components/ColorPicker';
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

  // Active color picker popover state: stores sessionId currently being edited
  const [activeColorPickerSessionId, setActiveColorPickerSessionId] = useState<SessionId | null>(null);
  const colorPickerContainerRef = useRef<HTMLDivElement>(null);

  // Close color picker on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        colorPickerContainerRef.current && 
        !colorPickerContainerRef.current.contains(e.target as Node)
      ) {
        setActiveColorPickerSessionId(null);
      }
    };

    if (activeColorPickerSessionId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeColorPickerSessionId]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleToggleMaster = (checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      enabled: checked,
    }));
  };

  const handleToggleSession = (id: SessionId, enabled: boolean) => {
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

  const handleTransparencyChange = (id: SessionId, transparency: number) => {
    setSettings(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [id]: {
          ...prev.sessions[id],
          transparency,
        },
      },
    }));
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SESSION_DISPLAY_SETTINGS);
    setActiveColorPickerSessionId(null);
  };

  // Render an individual session configuration row
  const renderSessionRow = (session: SessionConfig) => {
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
        {/* Session Header: Toggle, Name, Color Swatch */}
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

          {/* Color Trigger Button */}
          <div className="relative">
            <button
              type="button"
              disabled={isSessionDisabled}
              onClick={(e) => {
                e.stopPropagation();
                setActiveColorPickerSessionId(
                  activeColorPickerSessionId === session.id ? null : session.id
                );
              }}
              className={`w-6 h-6 rounded-md border shadow-xs cursor-pointer transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${
                activeColorPickerSessionId === session.id
                  ? 'ring-2 ring-accent border-accent scale-105'
                  : 'border-border-def hover:border-txt-muted'
              }`}
              style={{ backgroundColor: session.color }}
              title={`Change ${session.name} color`}
            />

            {/* Color Picker Popover */}
            {activeColorPickerSessionId === session.id && (
              <div 
                ref={colorPickerContainerRef}
                className="absolute right-0 top-8 z-50 shadow-2xl rounded-xl border border-border-def bg-surface animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="p-1">
                  <ColorPicker 
                    color={session.color} 
                    onChange={(newColor) => handleColorChange(session.id, newColor)} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls: Time inputs and Transparency */}
        <div className="flex flex-col gap-2 pt-1 border-t border-border-sub/50">
          {/* Time Range */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] text-txt-muted font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-txt-muted" />
              Session
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                disabled={isSessionDisabled}
                value={session.startTime}
                onChange={(e) => handleTimeChange(session.id, 'startTime', e.target.value)}
                maxLength={5}
                placeholder="HH:mm"
                className="w-14 px-1.5 py-0.5 text-center text-xs font-mono font-medium rounded border border-border-def bg-app-bg text-txt-primary hover:border-txt-muted focus:border-accent outline-none disabled:opacity-40 transition-colors"
                title="Start time (24h HH:mm)"
              />
              <span className="text-txt-muted text-xs">–</span>
              <input
                type="text"
                disabled={isSessionDisabled}
                value={session.endTime}
                onChange={(e) => handleTimeChange(session.id, 'endTime', e.target.value)}
                maxLength={5}
                placeholder="HH:mm"
                className="w-14 px-1.5 py-0.5 text-center text-xs font-mono font-medium rounded border border-border-def bg-app-bg text-txt-primary hover:border-txt-muted focus:border-accent outline-none disabled:opacity-40 transition-colors"
                title="End time (24h HH:mm)"
              />
            </div>
          </div>

          {/* Transparency Slider */}
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="text-[11px] text-txt-muted font-medium">
              Transparency
            </span>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-[150px]">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={isSessionDisabled}
                value={session.transparency}
                onChange={(e) => handleTransparencyChange(session.id, parseInt(e.target.value, 10))}
                className="w-20 h-1.5 appearance-none rounded-full bg-surface-elevated accent-accent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={`Transparency: ${session.transparency}%`}
              />
              <span className="text-[11px] font-mono text-txt-secondary w-8 text-right font-medium">
                {session.transparency}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 h-full flex flex-col min-w-0 bg-surface text-txt-primary select-none overflow-hidden font-sans">
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
            <div className="flex items-center gap-1.5 text-txt-muted">
              <Globe className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              <span className="font-medium">Timezone</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-accent-muted text-accent border border-accent/25">
              {settings.timezone}
            </span>
          </div>
        </div>

        {/* ─── SESSION GROUPS ─── */}
        {SESSION_GROUPS.map((group) => {
          const isOpen = openGroups[group.id] ?? true;
          const groupSessions = group.sessionIds.map(id => settings.sessions[id]);
          const enabledCount = groupSessions.filter(s => s.enabled).length;

          return (
            <div 
              key={group.id}
              className="flex flex-col rounded-xl border border-border-sub bg-surface overflow-hidden transition-colors"
            >
              {/* Accordion Group Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex items-center justify-between px-3 py-2 bg-surface hover:bg-surface-hover transition-colors cursor-pointer text-left"
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

              {/* Accordion Body */}
              {isOpen && (
                <div className="p-2.5 pt-1 flex flex-col gap-2 bg-surface/50 border-t border-border-sub/40">
                  {groupSessions.map((session) => renderSessionRow(session))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
