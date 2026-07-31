export interface TimeframeOption {
  label: string;
  value: string;
  minutes: number;
}

export const PRESET_TIMEFRAMES: TimeframeOption[] = [
  // Minutes
  { label: '1m', value: '1m', minutes: 1 },
  { label: '2m', value: '2m', minutes: 2 },
  { label: '3m', value: '3m', minutes: 3 },
  { label: '5m', value: '5m', minutes: 5 },
  { label: '10m', value: '10m', minutes: 10 },
  { label: '15m', value: '15m', minutes: 15 },
  { label: '30m', value: '30m', minutes: 30 },
  { label: '45m', value: '45m', minutes: 45 },
  // Hours
  { label: '1h', value: '1h', minutes: 60 },
  { label: '2h', value: '2h', minutes: 120 },
  { label: '3h', value: '3h', minutes: 180 },
  { label: '4h', value: '4h', minutes: 240 },
  { label: '6h', value: '6h', minutes: 360 },
  { label: '12h', value: '12h', minutes: 720 },
  // Days, Weeks, Months
  { label: 'D', value: 'D', minutes: 1440 },
  { label: 'W', value: 'W', minutes: 10080 },
  { label: 'M', value: 'M', minutes: 43200 },
];
