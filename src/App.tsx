import { useState, useEffect } from 'react';
import { ChartWorkspace } from '@/features/chart-workspace';

export default function App() {
  const [activeWorkspace] = useState<'charts'>('charts');

  useEffect(() => {
    document.title = 'FX Freeplay';
  }, []);

  return (
    <div className="h-full w-full">
      {activeWorkspace === 'charts' && <ChartWorkspace />}
    </div>
  );
}
