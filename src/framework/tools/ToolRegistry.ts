import React from 'react';
import type { OverlayTemplate } from 'klinecharts';

export type ToolSettingType = 'color' | 'number' | 'boolean' | 'select' | 'lineStyle';

export interface ToolSettingSchema {
  id: string; // e.g., 'lineWidth', 'lineColor'
  label: string; // 'Line Width'
  type: ToolSettingType;
  defaultValue: any;
  options?: { label: string; value: string | number }[]; // For 'select' type
  min?: number; // For 'number' type
  max?: number; // For 'number' type
  step?: number; // For 'number' type
}

export interface ToolTemplate {
  id: string;
  name: string; // e.g., 'Default', 'My Blue Line'
  themeColors?: {
    light: Record<string, any>; // Color settings mapped by id
    dark: Record<string, any>;
  };
  commonSettings: Record<string, any>; // Non-color settings mapped by id
}

/**
 * The result returned by a tool's onPressedMoving hook when the tool has
 * computed new geometry and wants the Drawing Framework to apply and
 * synchronize the update.
 *
 * Add new optional fields here as the framework evolves — callers that omit
 * a field will simply not trigger the corresponding framework behavior.
 */
export interface ToolMutationResult {
  /** Updated overlay points to apply via overrideOverlay and synchronize. */
  points?: any[];
  /** Optional updated extendData to apply via overrideOverlay and synchronize. */
  extendData?: any;
}

export interface ToolDefinition {
  id: string;          // e.g., 'trendLine'
  name: string;        // 'Trend Line'
  icon: React.FC<any>; // Toolbar icon component
  
  // Properties Schema for UI generation
  settingsSchema: ToolSettingSchema[]; 

  // Default templates provided by the tool
  defaultTemplates: ToolTemplate[];

  // klinecharts overlay definition
  createOverlayDef: () => OverlayTemplate;

  // Optional categorization fields for sidebar groups and shortcuts
  group?: string;      // e.g., 'lines'
  hotkey?: string;     // e.g., 'Alt + T'

  // Custom event hooks for complex interactive drag resizing/completion
  //
  // onPressedMoving may return either:
  //   - ToolMutationResult  — tool provides updated geometry; the Drawing Framework
  //                           applies overrideOverlay and handles synchronization.
  //   - true (boolean)      — tool has already called overrideOverlay itself (legacy).
  //                           The framework will still trigger forward synchronization.
  //   - false / undefined   — event not handled; framework falls through to default path.
  onPressedMoving?: (event: any, draggedIndex: number | null) => ToolMutationResult | boolean;
  onDrawEnd?: (event: any) => void;
}

class ToolRegistryImpl {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition) {
    this.tools.set(tool.id, tool);
    try {
      const def = tool.createOverlayDef?.();
      if (def?.name && def.name !== tool.id) {
        this.tools.set(def.name, tool);
      }
    } catch (_) {}
  }

  get(id: string): ToolDefinition | undefined {
    return this.tools.get(id) || Array.from(this.tools.values()).find((t) => {
      try {
        return t.createOverlayDef?.()?.name === id;
      } catch (_) {
        return false;
      }
    });
  }

  getAll(): ToolDefinition[] {
    const set = new Set(this.tools.values());
    return Array.from(set);
  }
}

export const ToolRegistry = new ToolRegistryImpl();
