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
  onPressedMoving?: (event: any, draggedIndex: number) => boolean;
  onDrawEnd?: (event: any) => void;
}

class ToolRegistryImpl {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition) {
    this.tools.set(tool.id, tool);
  }

  get(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}

export const ToolRegistry = new ToolRegistryImpl();
