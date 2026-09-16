import React from 'react';

export const HEADER_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', 'D', 'W', 'M'];

export interface LayoutOption {
  type: string;
  label: string;
  icon: React.ReactNode;
}

export const WORKSPACE_LAYOUT_OPTIONS: LayoutOption[] = [
  {
    type: '1',
    label: '1 Chart',
    icon: <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated" />,
  },
  {
    type: '2v',
    label: '2 Columns',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex">
        <div className="w-1/2 h-full border-r border-border-sub" />
        <div className="w-1/2 h-full" />
      </div>
    ),
  },
  {
    type: '2h',
    label: '2 Rows',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex flex-col">
        <div className="w-full h-1/2 border-b border-border-sub" />
        <div className="w-full h-1/2" />
      </div>
    ),
  },
  {
    type: '3v',
    label: '3 Columns',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex">
        <div className="w-1/3 h-full border-r border-border-sub" />
        <div className="w-1/3 h-full border-r border-border-sub" />
        <div className="w-1/3 h-full" />
      </div>
    ),
  },
  {
    type: '3h',
    label: '3 Rows',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex flex-col">
        <div className="w-full h-1/3 border-b border-border-sub" />
        <div className="w-full h-1/3 border-b border-border-sub" />
        <div className="w-full h-1/3" />
      </div>
    ),
  },
  {
    type: '3g1',
    label: '3 Split Left',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex">
        <div className="w-1/2 h-full border-r border-border-sub" />
        <div className="w-1/2 h-full flex flex-col">
          <div className="w-full h-1/2 border-b border-border-sub" />
          <div className="w-full h-1/2" />
        </div>
      </div>
    ),
  },
  {
    type: '3g2',
    label: '3 Split Top',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex flex-col">
        <div className="w-full h-1/2 border-b border-border-sub" />
        <div className="w-full h-1/2 flex">
          <div className="w-1/2 h-full border-r border-border-sub" />
          <div className="w-1/2 h-full" />
        </div>
      </div>
    ),
  },
  {
    type: '4g',
    label: '2x2 Grid',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated grid grid-cols-2 grid-rows-2">
        <div className="border-r border-b border-border-sub" />
        <div className="border-b border-border-sub" />
        <div className="border-r border-border-sub" />
        <div className="h-full w-full" />
      </div>
    ),
  },
  {
    type: '4v',
    label: '4 Columns',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex">
        <div className="w-1/4 h-full border-r border-border-sub" />
        <div className="w-1/4 h-full border-r border-border-sub" />
        <div className="w-1/4 h-full border-r border-border-sub" />
        <div className="w-1/4 h-full" />
      </div>
    ),
  },
  {
    type: '4h',
    label: '4 Rows',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex flex-col">
        <div className="w-full h-1/4 border-b border-border-sub" />
        <div className="w-full h-1/4 border-b border-border-sub" />
        <div className="w-full h-1/4 border-b border-border-sub" />
        <div className="w-full h-1/4" />
      </div>
    ),
  },
];
