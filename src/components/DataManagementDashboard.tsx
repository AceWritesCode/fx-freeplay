import React, { useState, useEffect } from 'react';
import {
  Database,
  PenTool,
  ListOrdered,
  LayoutGrid,
  Settings,
  Palette,
  HardDrive,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ChevronRight,
  X,
} from 'lucide-react';
import { useDataManagementStore } from '@/store';
import type { CategoryStorageSummary } from '@/repository';
import { CategoryDetailView } from './CategoryDetailView';
import { FactoryResetModal } from './FactoryResetModal';

interface DataManagementDashboardProps {
  onClose?: () => void;
}

const DEFAULT_CATEGORIES: Array<{
  id: string;
  name: string;
  description: string;
  type: CategoryStorageSummary['type'];
}> = [
  {
    id: 'market_bars',
    name: 'Market Data (CSV Bars)',
    description: 'Imported OHLCV candle datasets grouped by symbol and timeframe.',
    type: 'market_data',
  },
  {
    id: 'drawings',
    name: 'Chart Drawings',
    description: 'User-created chart drawing objects saved per symbol.',
    type: 'drawings',
  },
  {
    id: 'watchlist',
    name: 'Watchlist & Profiles',
    description: 'Imported symbol watchlists, active symbol state, and symbol metadata profiles.',
    type: 'watchlist',
  },
  {
    id: 'workspace_layout',
    name: 'Workspace Layouts',
    description: 'Saved window grid layouts, slot symbol configurations, and sync settings.',
    type: 'workspace_layout',
  },
  {
    id: 'settings',
    name: 'Application Preferences',
    description: 'Global chart settings, price precision, timezone, and theme preferences.',
    type: 'settings',
  },
  {
    id: 'drawing_templates',
    name: 'Drawing Templates & Presets',
    description: 'Custom toolbar defaults, folder configurations, and theme style presets.',
    type: 'drawing_templates',
  },
];

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getCategoryIcon(type: CategoryStorageSummary['type']) {
  switch (type) {
    case 'market_data':
      return <Database className="w-5 h-5 text-blue-400" />;
    case 'drawings':
      return <PenTool className="w-5 h-5 text-purple-400" />;
    case 'watchlist':
      return <ListOrdered className="w-5 h-5 text-amber-400" />;
    case 'workspace_layout':
      return <LayoutGrid className="w-5 h-5 text-emerald-400" />;
    case 'settings':
      return <Settings className="w-5 h-5 text-gray-400" />;
    case 'drawing_templates':
      return <Palette className="w-5 h-5 text-pink-400" />;
    default:
      return <HardDrive className="w-5 h-5 text-gray-400" />;
  }
}

export const DataManagementDashboard: React.FC<DataManagementDashboardProps> = ({ onClose }) => {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const {
    activeCategoryId,
    overview,
    isLoadingOverview,
    error,
    loadOverview,
    setActiveCategory,
  } = useDataManagementStore();

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (activeCategoryId) {
    return <CategoryDetailView />;
  }

  const overviewMap = new Map(overview.map((item) => [item.id, item]));
  const isOverviewReady = overview.length > 0;
  const totalStorageBytes = overview.reduce((sum, item) => sum + item.estimatedSizeBytes, 0);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6 text-txt-secondary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-def pb-4">
        <div>
          <h1 className="text-xl font-bold text-txt-primary flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-accent" />
            Storage & Data Management
          </h1>
          <p className="text-xs text-txt-muted mt-1">
            Inspect, manage, and audit application persistence storage across IndexedDB and LocalStorage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-txt-muted block tracking-wider uppercase font-medium">Total Footprint</span>
            {!isOverviewReady && isLoadingOverview ? (
              <div className="h-5 w-16 bg-surface-elevated animate-pulse rounded mt-0.5 inline-block" />
            ) : (
              <span className="text-sm font-semibold text-txt-primary transition-opacity duration-300">
                {formatBytes(totalStorageBytes)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 pl-2 border-l border-border-sub">
            <button
              onClick={() => loadOverview()}
              disabled={isLoadingOverview}
              className="p-2 bg-surface-elevated hover:bg-surface-hover text-txt-muted hover:text-txt-primary rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center border border-border-def"
              title="Refresh Storage Metrics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingOverview ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 bg-surface-elevated hover:bg-surface-hover text-txt-muted hover:text-txt-primary rounded-lg transition-colors cursor-pointer flex items-center justify-center border border-border-def"
                title="Close Data Management"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Storage Category Cards Grid (Richer Dashboard Loading State) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEFAULT_CATEGORIES.map((def) => {
          const item = overviewMap.get(def.id);
          const isItemLoading = !item && isLoadingOverview;

          return (
            <div
              key={def.id}
              className="bg-surface border border-border-def rounded-lg p-4 flex flex-col justify-between hover:border-border-sub transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-surface-elevated rounded-lg">
                    {getCategoryIcon(def.type)}
                  </div>
                  {item ? (
                    <span className="px-2.5 py-1 bg-surface-elevated text-txt-secondary text-xs font-mono rounded-full transition-all duration-300">
                      {formatBytes(item.estimatedSizeBytes)}
                    </span>
                  ) : (
                    <div className="h-6 w-16 bg-surface-elevated animate-pulse rounded-full" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-txt-primary group-hover:text-accent transition-colors">
                  {def.name}
                </h3>
                <p className="text-xs text-txt-muted mt-1 line-clamp-2">
                  {def.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border-def flex items-center justify-between">
                {item ? (
                  <span className="text-xs text-txt-muted font-medium transition-all duration-300">
                    {item.recordCount.toLocaleString()} {item.recordCount === 1 ? 'record' : 'records'}
                  </span>
                ) : (
                  <div className="h-4 w-20 bg-surface-elevated animate-pulse rounded" />
                )}
                <button
                  onClick={() => setActiveCategory(def.id)}
                  disabled={isItemLoading}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Inspect & Manage
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Danger Zone Section */}
      <div className="mt-8 border border-red-500/30 bg-red-500/5 rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
              <Trash2 className="w-4 h-4" />
              Danger Zone — Factory Reset
            </div>
            <p className="text-xs text-gray-400 max-w-2xl">
              Permanently erase all imported market data, saved chart drawings, watchlist symbols, workspace grid layouts, drawing templates, and user preferences across IndexedDB and LocalStorage. Leaves the application in a completely fresh install state.
            </p>
          </div>
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Factory Reset Application
          </button>
        </div>
      </div>

      <FactoryResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />
    </div>
  );
};
