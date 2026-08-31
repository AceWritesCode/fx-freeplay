import { useState, useEffect, useCallback, useMemo } from 'react';

export interface DrawingTemplate {
  id: string;
  name: string;
  group: string;
  mode: 'light' | 'dark';
  settings: any;
}

/**
 * Shared hook for drawing templates management.
 * Provides unified persistence, group filtering, light/dark mode separation,
 * and CRUD operations across DrawingSettingsDialog and DrawingFloatingToolbar.
 */
export function useDrawingTemplates(toolName?: string) {
  const [templates, setTemplates] = useState<DrawingTemplate[]>([]);
  const [activeTemplateMode, setActiveTemplateMode] = useState<'light' | 'dark'>('light');
  const [selectedGroup, setSelectedGroup] = useState<string>('Default');

  const storageKey = `fx_templates_${toolName || 'default'}`;

  // Load templates from localStorage
  const loadTemplates = useCallback(() => {
    if (!toolName) {
      setTemplates([]);
      return;
    }
    try {
      const saved = localStorage.getItem(`fx_templates_${toolName || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const upgraded: DrawingTemplate[] = parsed
            .filter((t: any) => t !== null && typeof t === 'object')
            .map((t: any) => ({
              id: t.id || Date.now().toString() + Math.random().toString(),
              name: t.name || 'Unnamed',
              group: t.group || 'Default',
              mode: t.mode || 'light',
              settings: t.settings
            }));
          setTemplates(upgraded);
        } else {
          setTemplates([]);
        }
      } else {
        setTemplates([]);
      }
    } catch (e) {
      console.error('[DEBUG] Failed to load templates:', e);
      setTemplates([]);
    }
  }, [toolName]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Helper to ensure selectedGroup updates if mode changes or templates are deleted
  useEffect(() => {
    const activeTpls = (templates || []).filter(t => t && t.mode === activeTemplateMode);
    const groups = Array.from(new Set(activeTpls.map(t => t && (t.group || 'Default'))));
    if (groups.length > 0) {
      if (!groups.includes(selectedGroup)) {
        setSelectedGroup(groups[0]);
      }
    } else {
      setSelectedGroup('Default');
    }
  }, [activeTemplateMode, templates]);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => {
      const updated = (prev || []).filter(t => t && t.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, [storageKey]);

  const deleteNameOption = useCallback((name: string) => {
    setTemplates(prev => {
      const updated = (prev || []).filter(t => t && t.name !== name);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, [storageKey]);

  const deleteGroupOption = useCallback((groupName: string) => {
    setTemplates(prev => {
      const updated = (prev || []).filter(t => t && t.group !== groupName);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, [storageKey]);

  const saveTemplate = useCallback((templateData: { name: string; group: string; mode: 'light' | 'dark'; settings: any }) => {
    const nameToSave = templateData.name.trim();
    const groupToSave = templateData.group.trim() || 'Default';
    const modeToSave = templateData.mode;

    setTemplates(prev => {
      const filtered = (prev || []).filter(t =>
        t && !(t.name.toLowerCase() === nameToSave.toLowerCase() &&
               t.group.toLowerCase() === groupToSave.toLowerCase() &&
               t.mode === modeToSave)
      );
      const newTemplate: DrawingTemplate = {
        id: Date.now().toString(),
        name: nameToSave,
        group: groupToSave,
        mode: modeToSave,
        settings: templateData.settings
      };
      const updated = [...filtered, newTemplate];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });

    setSelectedGroup(groupToSave);
  }, [storageKey]);

  // Derived template states
  const activeTemplates = useMemo(() => {
    return (templates || []).filter(t => t && t.mode === activeTemplateMode);
  }, [templates, activeTemplateMode]);

  const uniqueGroups = useMemo(() => {
    return Array.from(new Set(activeTemplates.map(t => t.group || 'Default')));
  }, [activeTemplates]);

  const visibleTemplates = useMemo(() => {
    return activeTemplates.filter(t => (t.group || 'Default') === selectedGroup);
  }, [activeTemplates, selectedGroup]);

  const allUniqueNames = useMemo(() => {
    return Array.from(new Set((templates || []).filter(t => t && t.name).map(t => t.name)));
  }, [templates]);

  const allUniqueGroups = useMemo(() => {
    return Array.from(new Set((templates || []).filter(t => t && t.group).map(t => t.group)));
  }, [templates]);

  return {
    templates,
    setTemplates,
    activeTemplateMode,
    setActiveTemplateMode,
    selectedGroup,
    setSelectedGroup,
    deleteTemplate,
    deleteNameOption,
    deleteGroupOption,
    saveTemplate,
    activeTemplates,
    uniqueGroups,
    visibleTemplates,
    allUniqueNames,
    allUniqueGroups,
    loadTemplates
  };
}
