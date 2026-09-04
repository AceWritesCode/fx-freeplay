import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCaptureStore } from '../store/useCaptureStore';

const ActiveCountdownOverlay: React.FC = () => {
  const {
    countdownValue,
    selectedTarget,
    confirmTargetSelection,
    cancelFlow,
  } = useCaptureStore();

  const [currentCount, setCurrentCount] = useState<number>(countdownValue || 3);
  const hasTriggeredRef = useRef(false);

  const handleCancel = () => {
    console.log('[Capture] Recording countdown cancelled');
    cancelFlow();
  };

  // 1. Countdown timer interval (strictly state decrement only, no store mutations in setter)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        clearInterval(interval);
        console.log('[Capture] Recording countdown cancelled');
        cancelFlow();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [cancelFlow]);

  // 2. Cleanly trigger recording start when countdown reaches 0 (outside of render pass)
  useEffect(() => {
    if (currentCount <= 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      const target = selectedTarget || { type: 'workspace' };
      confirmTargetSelection(target);
    }
  }, [currentCount, selectedTarget, confirmTargetSelection]);

  if (currentCount <= 0 || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-150">
      {/* Animated Circular Badge */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing outer ring */}
        <div className="w-32 h-32 rounded-full border-4 border-accent/40 animate-ping absolute" />
        {/* Inner circle container */}
        <div className="w-28 h-28 rounded-full bg-surface-elevated/95 border-2 border-accent shadow-2xl backdrop-blur-md flex items-center justify-center text-5xl font-black text-accent font-mono animate-in zoom-in-75 duration-200">
          {currentCount}
        </div>
      </div>

      <div className="mt-6 text-sm font-bold text-txt-primary tracking-wide uppercase">
        Recording starting...
      </div>

      <button
        type="button"
        onClick={handleCancel}
        title="Escape to cancel"
        className="mt-4 px-3 py-1 rounded-full text-xs font-semibold text-txt-muted hover:text-txt-primary hover:bg-surface-elevated border border-border-sub hover:border-border-def transition-colors cursor-pointer"
      >
        Cancel (Esc)
      </button>
    </div>,
    document.body
  );
};

export const CountdownOverlay: React.FC = () => {
  const flowStep = useCaptureStore((s) => s.flowStep);

  if (flowStep !== 'countdown') {
    return null;
  }

  return <ActiveCountdownOverlay />;
};
