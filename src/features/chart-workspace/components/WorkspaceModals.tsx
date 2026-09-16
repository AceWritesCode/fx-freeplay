import React from 'react';
import { Trash2, AlertCircle } from 'lucide-react';

interface WorkspaceModalsProps {
  pendingRemoveSymbol: string | null;
  onCancelRemoveSymbol: () => void;
  onConfirmRemoveSymbol: (symbol: string) => void | Promise<void>;
  customAlert: { title: string; message: string } | null;
  onAcknowledgeAlert: () => void;
}

export const WorkspaceModals: React.FC<WorkspaceModalsProps> = ({
  pendingRemoveSymbol,
  onCancelRemoveSymbol,
  onConfirmRemoveSymbol,
  customAlert,
  onAcknowledgeAlert,
}) => {
  return (
    <>
      {/* Watchlist Remove Confirmation Dialog */}
      {pendingRemoveSymbol && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-overlay-bg backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-modal-bg border border-border-def rounded-xl shadow-2xl w-[340px] p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-status-error/10 border border-status-error/20 flex items-center justify-center text-status-error">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-txt-primary">Delete Symbol Data</h3>
                <p className="text-txt-muted text-[11px] mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-txt-secondary text-xs leading-normal">
              Are you sure you want to delete symbol <span className="font-semibold text-txt-primary">"{pendingRemoveSymbol}"</span>? This will permanently delete its timeframe data, drawings, and info profile from local storage. Other symbols will not be affected.
            </p>
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={onCancelRemoveSymbol}
                className="flex-1 py-2 bg-surface-elevated border border-border-def text-txt-secondary text-xs font-semibold rounded hover:bg-surface-hover hover:text-txt-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirmRemoveSymbol(pendingRemoveSymbol)}
                className="flex-1 py-2 bg-status-error hover:bg-status-error/90 border border-status-error text-txt-inverse text-xs font-semibold rounded transition-colors cursor-pointer"
              >
                Delete Symbol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Overlay Modal */}
      {customAlert && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-overlay-bg backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-modal-bg border border-border-def rounded-xl shadow-2xl w-[360px] p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-status-warning">
              <div className="w-10 h-10 rounded-full bg-status-warning/10 border border-status-warning/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-txt-primary">{customAlert.title}</h3>
              </div>
            </div>
            <p className="text-txt-secondary text-xs leading-normal">
              {customAlert.message}
            </p>
            <button
              onClick={onAcknowledgeAlert}
              className="w-full mt-2 py-2 bg-accent hover:bg-accent-hover text-txt-inverse text-xs font-semibold rounded transition-colors cursor-pointer"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </>
  );
};
