import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { useDataManagementStore } from '@/store';

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FactoryResetModal: React.FC<FactoryResetModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { performFactoryReset } = useDataManagementStore();

  if (!isOpen) return null;

  const isConfirmed = confirmInput.trim().toUpperCase() === 'RESET';

  const handleReset = async () => {
    if (!isConfirmed || isResetting) return;
    setIsResetting(true);
    try {
      await performFactoryReset();
      setIsResetting(false);
      onClose();
      // Smooth page reload to re-initialize fresh app state cleanly
      window.location.reload();
    } catch (err) {
      console.error('Factory Reset failed:', err);
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e222d] border border-red-500/50 rounded-lg max-w-md w-full p-6 space-y-5 shadow-2xl relative text-gray-200">
        <button
          onClick={onClose}
          disabled={isResetting}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-red-400">
          <div className="p-2.5 bg-red-500/10 rounded-lg border border-red-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Perform Factory Reset</h2>
            <p className="text-xs text-red-400 font-medium">Irreversible Destructive Action</p>
          </div>
        </div>

        <div className="text-xs text-gray-300 space-y-2 bg-[#252936] p-3.5 rounded-md border border-[#363a45]">
          <p className="font-semibold text-white">This operation will permanently delete:</p>
          <ul className="list-disc pl-4 space-y-1 text-gray-400">
            <li>All imported market data CSV candle datasets (`STORES.MARKET_BARS`)</li>
            <li>All saved chart drawing objects (`STORES.DRAWINGS`)</li>
            <li>All watchlist symbols and profile metadata (`STORES.WATCHLIST`)</li>
            <li>All window grid layouts and slot configurations (`STORES.WORKSPACE_LAYOUT`)</li>
            <li>All drawing tool templates, folders, and custom themes (`LocalStorage`)</li>
            <li>All global application preferences and settings (`STORES.SETTINGS`)</li>
          </ul>
          <p className="text-red-400 pt-1 font-medium">
            The application will return to a completely fresh installation state.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-300 font-medium block">
            Type <span className="font-bold text-white font-mono bg-red-500/20 px-1 py-0.5 rounded border border-red-500/30">RESET</span> below to confirm:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={isResetting}
            placeholder="RESET"
            className="w-full px-3 py-2 bg-[#141722] border border-[#363a45] focus:border-red-500 rounded-md text-xs font-mono text-white placeholder-gray-600 outline-none uppercase transition-colors"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isResetting}
            className="px-4 py-2 bg-[#2a2e39] hover:bg-[#363a45] text-gray-300 rounded-md text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            disabled={!isConfirmed || isResetting}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/30 disabled:text-red-400/50 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-2"
          >
            {isResetting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resetting Application...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Factory Reset Application
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
