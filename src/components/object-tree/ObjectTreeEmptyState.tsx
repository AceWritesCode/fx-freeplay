import React from 'react';
import { Layers } from 'lucide-react';

export const ObjectTreeEmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-txt-muted px-6">
      <Layers className="w-8 h-8 text-txt-muted mb-2 opacity-50" />
      <p className="text-[11px] leading-relaxed">No drawings on the chart.</p>
    </div>
  );
};
