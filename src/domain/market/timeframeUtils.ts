import type { KLineData } from '@/utils/dataUtils';

export const getTimeframeMinutes = (tf: string): number => {
  if (tf === 'D') return 1440;
  if (tf === 'W') return 10080;
  if (tf === 'M') return 43200;
  if (tf.endsWith('m')) return parseInt(tf) || 1;
  if (tf.endsWith('h') || tf.endsWith('H')) return (parseInt(tf) || 1) * 60;
  return 1;
};

export const getBestTimeframeFile = (
  files: Record<string, File>,
  targetTf: string
): { file: File; tf: string; minutes: number } | null => {
  const targetMinutes = getTimeframeMinutes(targetTf);
  
  let bestFile: File | null = null;
  let bestTf = '';
  let bestMinutes = -1;

  for (const [tf, file] of Object.entries(files)) {
    const fileMinutes = getTimeframeMinutes(tf);
    if (fileMinutes <= targetMinutes && targetMinutes % fileMinutes === 0) {
      if (fileMinutes > bestMinutes) {
        bestMinutes = fileMinutes;
        bestTf = tf;
        bestFile = file;
      }
    }
  }

  if (bestFile) {
    return { file: bestFile, tf: bestTf, minutes: bestMinutes };
  }
  
  for (const [tf, file] of Object.entries(files)) {
    const fileMinutes = getTimeframeMinutes(tf);
    if (fileMinutes <= targetMinutes) {
      if (fileMinutes > bestMinutes) {
        bestMinutes = fileMinutes;
        bestTf = tf;
        bestFile = file;
      }
    }
  }

  return bestFile ? { file: bestFile, tf: bestTf, minutes: bestMinutes } : null;
};

export const matchFileToTimeframe = (filename: string): string | null => {
  const name = filename.toLowerCase();
  
  // Daily, Weekly, Monthly patterns
  if (name.includes('monthly') || name.includes('mn') || name.includes('1month') || name.endsWith('_m.csv')) {
    return 'M';
  }
  if (name.includes('weekly') || name.includes('w1') || name.includes('1week') || name.endsWith('_w.csv')) {
    return 'W';
  }
  if (name.includes('daily') || name.includes('d1') || name.includes('1day') || name.endsWith('_d.csv')) {
    return 'D';
  }
  
  // Minute and Hour patterns
  const mMatch = name.match(/(\d+)\s*(m|min|minute|s)/);
  if (mMatch) {
    const mins = parseInt(mMatch[1], 10);
    return `${mins}m`;
  }
  const hMatch = name.match(/(\d+)\s*(h|hr|hour)/);
  if (hMatch) {
    const hrs = parseInt(hMatch[1], 10);
    return `${hrs}h`;
  }

  // Check alternative short forms like m1, m5, h1, h4
  const shortMMatch = name.match(/m(\d+)/);
  if (shortMMatch) {
    return `${shortMMatch[1]}m`;
  }
  const shortHMatch = name.match(/h(\d+)/);
  if (shortHMatch) {
    return `${shortHMatch[1]}h`;
  }
  
  // Fallbacks if we can find specific suffixes or keywords
  if (name.includes('_m1') || name.includes('-m1') || name.endsWith('_1.csv')) return '1m';
  if (name.includes('_m5') || name.includes('-m5') || name.endsWith('_5.csv')) return '5m';
  if (name.includes('_m15') || name.includes('-m15') || name.endsWith('_15.csv')) return '15m';
  if (name.includes('_m30') || name.includes('-m30') || name.endsWith('_30.csv')) return '30m';
  if (name.includes('_h1') || name.includes('-h1') || name.endsWith('_60.csv')) return '1h';
  if (name.includes('_h4') || name.includes('-h4') || name.endsWith('_240.csv')) return '4h';
  if (name.includes('_d') || name.includes('-d') || name.endsWith('_1440.csv')) return 'D';
  if (name.includes('_w') || name.includes('-w') || name.endsWith('_10080.csv')) return 'W';
  if (name.includes('_m') || name.includes('-m') || name.endsWith('_43200.csv')) return 'M';

  return null;
};

export const getLayoutChartCount = (type: string): number => {
  if (type.startsWith('4')) return 4;
  if (type.startsWith('3')) return 3;
  if (type.startsWith('2')) return 2;
  return 1;
};

export const shiftCandlesTimezone = (
  raw1m: KLineData[],
  timezoneAdjustmentEnabled: boolean,
  brokerTimezoneOffset: number,
  userTimezoneOffset: number
): KLineData[] => {
  if (!timezoneAdjustmentEnabled) return raw1m;
  const offsetDiffMs = (userTimezoneOffset - brokerTimezoneOffset) * 60 * 1000;
  if (offsetDiffMs === 0) return raw1m;
  return raw1m.map(c => ({
    ...c,
    timestamp: c.timestamp + offsetDiffMs
  }));
};
