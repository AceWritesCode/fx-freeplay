import { create } from 'zustand';

export interface DrawingPoint {
  timestamp?: number;
  dataIndex?: number;
  value?: number;
}

export interface DrawingInstance {
  id: string;             // Unique ID for the specific drawing
  toolId: string;         // References the ToolDefinition
  name: string;           // Custom name
  groupId?: string;       // For organizing in folders later
  isVisible: boolean;     // Toggle visibility (eye icon)
  isLocked: boolean;      // Lock position (padlock icon)
  templateId?: string;    // The template currently applied
  settings: Record<string, any>; // Overrides/current settings
  points: DrawingPoint[]; // The actual coordinates on the chart
  chartId: string;        // ID of the chart (main chart vs indicators etc if needed)
}

interface DrawingState {
  drawings: DrawingInstance[];
  
  // Actions
  addDrawing: (drawing: DrawingInstance) => void;
  updateDrawing: (id: string, updates: Partial<DrawingInstance>) => void;
  removeDrawing: (id: string) => void;
  setDrawings: (drawings: DrawingInstance[]) => void;
  clearDrawings: () => void;
}

export const useDrawingStore = create<DrawingState>((set) => ({
  drawings: [],

  addDrawing: (drawing) => set((state) => ({
    drawings: [...state.drawings, drawing]
  })),

  updateDrawing: (id, updates) => set((state) => ({
    drawings: state.drawings.map(d => 
      d.id === id ? { ...d, ...updates } : d
    )
  })),

  removeDrawing: (id) => set((state) => ({
    drawings: state.drawings.filter(d => d.id !== id)
  })),

  setDrawings: (drawings) => set({ drawings }),
  
  clearDrawings: () => set({ drawings: [] }),
}));
