import React, { useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import { useDataManagementStore } from '@/store';
import type { CategoryStorageSummary } from '@/repository';

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

import { CategoryDetailView } from './CategoryDetailView';

export const DataManagementDashboard: React.FC = () => {
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

  const totalStorageBytes = overview.reduce((sum, item) => sum + item.estimatedSizeBytes, 0);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6 text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a2e39] pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-blue-500" />
            Storage & Data Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Inspect, manage, and audit application persistence storage across IndexedDB and LocalStorage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-gray-400 block">Total Footprint</span>
            <span className="text-sm font-semibold text-white">{formatBytes(totalStorageBytes)}</span>
          </div>
          <button
            onClick={() => loadOverview()}
            disabled={isLoadingOverview}
            className="p-2 bg-[#2a2e39] hover:bg-[#363a45] text-gray-300 hover:text-white rounded-md transition-colors disabled:opacity-50"
            title="Refresh Storage Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingOverview ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoadingOverview && overview.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">Analyzing persistence storage metrics...</p>
        </div>
      ) : (
        /* Storage Category Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {overview.map((category) => (
            <div
              key={category.id}
              className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col justify-between hover:border-[#3a3e4b] transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-[#2a2e39] rounded-lg">
                    {getCategoryIcon(category.type)}
                  </div>
                  <span className="px-2.5 py-1 bg-[#2a2e39] text-gray-300 text-xs font-mono rounded-full">
                    {formatBytes(category.estimatedSizeBytes)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {category.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {category.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#2a2e39] flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">
                  {category.recordCount.toLocaleString()} {category.recordCount === 1 ? 'record' : 'records'}
                </span>
                <button
                  onClick={() => setActiveCategory(category.id)}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Inspect & Manage
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
            disabled
            className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-md text-xs font-semibold cursor-not-allowed opacity-75 flex items-center gap-1.5"
            title="Factory Reset will be enabled in Checkpoint 5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Factory Reset (Checkpoint 5)
          </button>
        </div>
      </div>
    </div>
  );
};
