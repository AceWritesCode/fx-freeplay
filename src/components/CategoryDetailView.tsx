import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckSquare,
  Square,
  Eye,
  ChevronDown,
  Copy,
  Check,
  Code,
} from 'lucide-react';
import { useDataManagementStore } from '@/store';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const RecordPayloadViewer: React.FC<{
  record: any;
  copiedFieldKey: string | null;
  onCopy: (text: string, keyLabel: string) => void;
}> = ({ record, copiedFieldKey, onCopy }) => {
  const payload = record.metadata?.drawing || record.metadata?.value || record.metadata || {};
  const entries = Object.entries(payload);

  if (entries.length === 0) {
    return <div className="text-xs text-gray-500 italic py-1 font-sans">No stored payload properties found.</div>;
  }

  return (
    <div className="space-y-1.5 py-1">
      {entries.map(([key, val]) => {
        const isComplex = typeof val === 'object' && val !== null;
        const stringVal = isComplex ? JSON.stringify(val, null, 2) : String(val);
        const copyKey = `${record.id}_${key}`;

        return (
          <div
            key={key}
            className="flex items-start justify-between gap-4 py-1.5 px-3 rounded bg-[#1c1f2b]/60 hover:bg-[#1c1f2b] transition-colors border border-white/[0.03]"
          >
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <span className="w-36 flex-shrink-0 text-blue-300 font-medium text-[11px] truncate" title={key}>
                {key}
              </span>
              <div className="flex-1 min-w-0">
                {isComplex ? (
                  <pre className="bg-[#11131a] p-2 rounded border border-white/5 text-[11px] text-gray-300 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                    {stringVal}
                  </pre>
                ) : (
                  <span className="text-[11px] font-mono text-gray-200 break-all">
                    {val === null ? <span className="text-gray-500 italic">null</span> : stringVal}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onCopy(stringVal, copyKey)}
              className="p-1 text-gray-400 hover:text-white hover:bg-[#2a2e39] rounded transition-colors flex-shrink-0 cursor-pointer"
              title={`Copy ${key} value`}
            >
              {copiedFieldKey === copyKey ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const CategoryDetailView: React.FC = () => {
  const {
    activeCategoryId,
    overview,
    records,
    totalRecordCount,
    page,
    pageSize,
    searchQuery,
    selectedRecordIds,
    isLoadingRecords,
    error,
    setActiveCategory,
    setSearchQuery,
    setPage,
    toggleRecordSelection,
    selectAllRecordsOnPage,
    deleteRecord,
    deleteSelectedRecords,
    clearActiveCategory,
  } = useDataManagementStore();

  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [copiedFieldKey, setCopiedFieldKey] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    type: 'single' | 'selected' | 'clear';
    recordId?: string;
    title?: string;
  } | null>(null);

  const activeCategory = overview.find((c) => c.id === activeCategoryId);
  const totalPages = Math.ceil(totalRecordCount / pageSize) || 1;
  const pageIds = records.map((r) => r.id);
  const isAllPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedRecordIds.includes(id));
  const isMarketData = activeCategoryId === 'market_bars';

  const copyToClipboard = (text: string, keyLabel: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFieldKey(keyLabel);
    setTimeout(() => setCopiedFieldKey(null), 2000);
  };

  const handleConfirmAction = async () => {
    if (!confirmModal || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (confirmModal.type === 'single' && confirmModal.recordId) {
        await deleteRecord(confirmModal.recordId);
      } else if (confirmModal.type === 'selected') {
        await deleteSelectedRecords();
      } else if (confirmModal.type === 'clear') {
        await clearActiveCategory();
      }
      setIsDeleting(false);
      setConfirmModal(null);
    } catch (err: any) {
      console.error('[CategoryDetailView] Delete action failed:', err);
      setIsDeleting(false);
      setDeleteError(err?.message || 'Failed to complete deletion. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6 text-gray-200">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-[#2a2e39] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveCategory(null)}
            className="p-2 bg-[#2a2e39] hover:bg-[#363a45] text-gray-300 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">
              {activeCategory?.name || 'Category Details'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeCategory?.description}
            </p>
          </div>
        </div>

        {/* Global Category Clear Action */}
        <button
          onClick={() =>
            setConfirmModal({
              type: 'clear',
              title: `Clear All ${activeCategory?.name || 'Category'} Records`,
            })
          }
          disabled={totalRecordCount === 0}
          className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Entire Category
        </button>
      </div>

      {/* Filter & Selection Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records by title or ID..."
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border-def focus:border-accent rounded-md text-xs text-txt-primary placeholder-txt-muted outline-none transition-colors"
          />
        </div>

        {selectedRecordIds.length > 0 && (
          <div className="flex items-center gap-3 bg-accent-muted border border-accent/30 px-3.5 py-1.5 rounded-md">
            <span className="text-xs text-accent font-medium">
              {selectedRecordIds.length} {selectedRecordIds.length === 1 ? 'record' : 'records'} selected
            </span>
            <button
              onClick={() =>
                setConfirmModal({
                  type: 'selected',
                  title: `Delete ${selectedRecordIds.length} Selected Records`,
                })
              }
              className="px-2.5 py-1 bg-status-error text-txt-inverse rounded text-xs font-semibold hover:bg-status-error/90 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-status-error/10 border border-status-error/30 rounded-lg text-status-error text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-surface border border-border-def rounded-lg overflow-hidden">
        {isLoadingRecords ? (
          <div className="flex flex-col items-center justify-center py-16 text-txt-muted gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-sm">Fetching category records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-txt-muted text-sm">
            No records found for this category matching search filter.
          </div>
        ) : (
          <table className="w-full text-left text-xs text-txt-secondary">
            <thead className="bg-surface-elevated text-txt-muted font-semibold border-b border-border-sub">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button onClick={selectAllRecordsOnPage} className="text-txt-muted hover:text-txt-primary cursor-pointer">
                    {isAllPageSelected ? (
                      <CheckSquare className="w-4 h-4 text-accent" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Record Title / Identifier</th>
                <th className="p-3">Metadata</th>
                <th className="p-3 text-right">Size</th>
                <th className="p-3 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-def">
              {records.map((r) => {
                const isSelected = selectedRecordIds.includes(r.id);
                const isExpanded = expandedRecordId === r.id;

                return (
                  <React.Fragment key={r.id}>
                    <tr className={`hover:bg-surface-hover transition-colors ${isSelected ? 'bg-accent-muted' : ''} ${isExpanded ? 'bg-surface-hover' : ''}`}>
                      <td className="p-3 text-center">
                        <button onClick={() => toggleRecordSelection(r.id)} className="text-txt-muted hover:text-txt-primary cursor-pointer">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-accent" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 font-semibold text-txt-primary">{r.title}</td>
                      <td className="p-3 text-txt-muted">{r.subtitle}</td>
                      <td className="p-3 text-right font-mono text-txt-secondary">{formatBytes(r.sizeBytes)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isMarketData && (
                            <button
                              onClick={() => setExpandedRecordId(isExpanded ? null : r.id)}
                              className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                isExpanded
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : 'bg-[#2a2e39] hover:bg-[#363a45] text-gray-300 hover:text-white'
                              }`}
                              title={isExpanded ? 'Hide Payload' : 'View Stored Payload'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isExpanded ? 'Hide' : 'View'}</span>
                              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setConfirmModal({
                                type: 'single',
                                recordId: r.id,
                                title: `Delete "${r.title}"?`,
                              })
                            }
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline Expandable Data Inspection Panel */}
                    {!isMarketData && isExpanded && (
                      <tr className="bg-[#14161e]/90">
                        <td colSpan={5} className="px-6 py-3 border-b border-[#2a2e39]/60">
                          <div className="space-y-2 select-text pl-4 border-l-2 border-blue-500/40 my-1 transition-all duration-300">
                            {/* Simple Top Action Bar */}
                            <div className="flex items-center justify-between pb-1 text-[11px] text-gray-400 font-sans">
                              <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                                <Code className="w-3.5 h-3.5 text-blue-400" />
                                Stored Record Payload
                              </span>
                              <button
                                onClick={() => {
                                  const targetPayload = r.metadata?.drawing || r.metadata?.value || r.metadata;
                                  copyToClipboard(JSON.stringify(targetPayload, null, 2), `full_${r.id}`);
                                }}
                                className="px-2 py-0.5 bg-[#252936] hover:bg-[#323646] text-gray-300 hover:text-white rounded text-[11px] font-sans border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                {copiedFieldKey === `full_${r.id}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied JSON!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-gray-400" />
                                    <span>Copy Record JSON</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Clean Key-Value Pair Rows (No nested card, no nested table) */}
                            <RecordPayloadViewer record={r} copiedFieldKey={copiedFieldKey} onCopy={copyToClipboard} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 bg-[#2a2e39] border-t border-[#363a45] flex items-center justify-between text-xs">
            <span className="text-gray-400">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalRecordCount)} of {totalRecordCount} records
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1 bg-[#1e222d] hover:bg-[#363a45] text-gray-300 disabled:opacity-40 rounded cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-white font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1 bg-[#1e222d] hover:bg-[#363a45] text-gray-300 disabled:opacity-40 rounded cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Destructive Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-red-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              Confirm Destructive Action
            </div>
            <p className="text-xs text-gray-300">
              Are you sure you want to delete {confirmModal.title || 'this selection'}? This action is permanent and cannot be undone.
            </p>

            {deleteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  if (!isDeleting) {
                    setConfirmModal(null);
                    setDeleteError(null);
                  }
                }}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-[#2a2e39] hover:bg-[#363a45] disabled:opacity-40 text-gray-300 rounded-md text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
