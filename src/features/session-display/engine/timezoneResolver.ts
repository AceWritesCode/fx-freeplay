/**
 * Timezone and Daylight Saving Time (DST) resolution utilities for the Session Display engine.
 * Interprets session start and end times as wall-clock times in the effective IANA timezone.
 */

export interface WallClockParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  hour: number;  // 0-23
  minute: number;// 0-59
  second: number;// 0-59
}

/**
 * Mapping of FX Freeplay application timezone labels to canonical IANA timezone identifiers.
 */
export const APP_LABEL_TO_IANA: Record<string, string> = {
  // Application labels from src/config/timezones.ts
  'UTC': 'UTC',
  'Exchange': 'UTC',
  '(UTC-10) Honolulu': 'Pacific/Honolulu',
  '(UTC-8) Anchorage': 'America/Anchorage',
  '(UTC-8) Juneau': 'America/Juneau',
  '(UTC-7) Los Angeles': 'America/Los_Angeles',
  '(UTC-7) Phoenix': 'America/Phoenix',
  '(UTC-7) Vancouver': 'America/Vancouver',
  '(UTC-6) Denver': 'America/Denver',
  '(UTC-6) Mexico City': 'America/Mexico_City',
  '(UTC-6) San Salvador': 'America/El_Salvador',
  '(UTC-5) Bogota': 'America/Bogota',
  '(UTC-5) Chicago': 'America/Chicago',
  '(UTC-5) Lima': 'America/Lima',
  '(UTC-4) Caracas': 'America/Caracas',
  '(UTC-4) New York': 'America/New_York',
  '(UTC-4) Santiago': 'America/Santiago',
  '(UTC-4) Toronto': 'America/Toronto',
  '(UTC-3) Buenos Aires': 'America/Argentina/Buenos_Aires',
  '(UTC-3) Halifax': 'America/Halifax',
  '(UTC-3) Sao Paulo': 'America/Sao_Paulo',
  '(UTC) Azores': 'Atlantic/Azores',
  '(UTC) Reykjavik': 'Atlantic/Reykjavik',
  '(UTC+1) Casablanca': 'Africa/Casablanca',
  '(UTC+1) Dublin': 'Europe/Dublin',
  '(UTC+1) Lagos': 'Africa/Lagos',
  '(UTC+1) Lisbon': 'Europe/Lisbon',
  '(UTC+1) London': 'Europe/London',
  '(UTC+1) Tunis': 'Africa/Tunis',
  '(UTC+2) Amsterdam': 'Europe/Amsterdam',
  '(UTC+2) Belgrade': 'Europe/Belgrade',
  '(UTC+2) Berlin': 'Europe/Berlin',
  '(UTC+2) Frankfurt': 'Europe/Berlin',
  '(UTC+2) Bratislava': 'Europe/Bratislava',
  '(UTC+2) Brussels': 'Europe/Brussels',
  '(UTC+2) Budapest': 'Europe/Budapest',
  '(UTC+2) Copenhagen': 'Europe/Copenhagen',
  '(UTC+2) Johannesburg': 'Africa/Johannesburg',
  '(UTC+2) Ljubljana': 'Europe/Ljubljana',
  '(UTC+2) Luxembourg': 'Europe/Luxembourg',
  '(UTC+2) Madrid': 'Europe/Madrid',
  '(UTC+2) Malta': 'Europe/Malta',
  '(UTC+2) Oslo': 'Europe/Oslo',
  '(UTC+2) Paris': 'Europe/Paris',
  '(UTC+2) Prague': 'Europe/Prague',
  '(UTC+2) Rome': 'Europe/Rome',
  '(UTC+2) Stockholm': 'Europe/Stockholm',
  '(UTC+2) Vienna': 'Europe/Vienna',
  '(UTC+2) Warsaw': 'Europe/Warsaw',
  '(UTC+2) Zagreb': 'Europe/Zagreb',
  '(UTC+2) Zurich': 'Europe/Zurich',
  '(UTC+3) Athens': 'Europe/Athens',
  '(UTC+3) Bahrain': 'Asia/Bahrain',
  '(UTC+3) Bucharest': 'Europe/Bucharest',
  '(UTC+3) Cairo': 'Africa/Cairo',
  '(UTC+3) Helsinki': 'Europe/Helsinki',
  '(UTC+3) Istanbul': 'Europe/Istanbul',
  '(UTC+3) Jerusalem': 'Asia/Jerusalem',
  '(UTC+3) Kuwait': 'Asia/Kuwait',
  '(UTC+3) Moscow': 'Europe/Moscow',
  '(UTC+3) Nairobi': 'Africa/Nairobi',
  '(UTC+3) Nicosia': 'Asia/Nicosia',
  '(UTC+3) Qatar': 'Asia/Qatar',
  '(UTC+3) Riga': 'Europe/Riga',
  '(UTC+3) Riyadh': 'Asia/Riyadh',
  '(UTC+3) Sofia': 'Europe/Sofia',
  '(UTC+3) Tallinn': 'Europe/Tallinn',
  '(UTC+3) Vilnius': 'Europe/Vilnius',
  '(UTC+3:30) Tehran': 'Asia/Tehran',
  '(UTC+4) Dubai': 'Asia/Dubai',
  '(UTC+4) Muscat': 'Asia/Muscat',
  '(UTC+4:30) Kabul': 'Asia/Kabul',
  '(UTC+5) Ashgabat': 'Asia/Ashgabat',
  '(UTC+5) Astana': 'Asia/Almaty',
  '(UTC+5) Karachi': 'Asia/Karachi',
  '(UTC+5:30) Colombo': 'Asia/Colombo',
  '(UTC+5:30) Kolkata': 'Asia/Kolkata',
  '(UTC+5:45) Kathmandu': 'Asia/Kathmandu',
  '(UTC+6) Dhaka': 'Asia/Dhaka',
  '(UTC+6:30) Yangon': 'Asia/Yangon',
  '(UTC+7) Bangkok': 'Asia/Bangkok',
  '(UTC+7) Ho Chi Minh': 'Asia/Ho_Chi_Minh',
  '(UTC+7) Jakarta': 'Asia/Jakarta',
  '(UTC+8) Chongqing': 'Asia/Chongqing',
  '(UTC+8) Hong Kong': 'Asia/Hong_Kong',
  '(UTC+8) Kuala Lumpur': 'Asia/Kuala_Lumpur',
  '(UTC+8) Manila': 'Asia/Manila',
  '(UTC+8) Perth': 'Australia/Perth',
  '(UTC+8) Shanghai': 'Asia/Shanghai',
  '(UTC+8) Singapore': 'Asia/Singapore',
  '(UTC+8) Taipei': 'Asia/Taipei',
  '(UTC+9) Seoul': 'Asia/Seoul',
  '(UTC+9) Tokyo': 'Asia/Tokyo',
  '(UTC+9:30) Adelaide': 'Australia/Adelaide',
  '(UTC+10) Brisbane': 'Australia/Brisbane',
  '(UTC+10) Sydney': 'Australia/Sydney',
  '(UTC+11) Norfolk Island': 'Pacific/Norfolk',
  '(UTC+12) New Zealand': 'Pacific/Auckland',
  '(UTC+12:45) Chatham Islands': 'Pacific/Chatham',
  '(UTC+13) Tokelau': 'Pacific/Fakaofo',
};

/**
 * Checks if a string is a valid IANA timezone supported by the runtime.
 */
export function isValidIanaTimezone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves any raw timezone string (auto, app label, or explicit IANA) into a valid IANA identifier.
 *
 * @param configuredTimezone - The timezone setting from SessionDisplaySettings (e.g. 'auto', 'America/New_York')
 * @param appTimezone - The chart's active timezone label (e.g. '(UTC-4) New York', 'Exchange', 'UTC')
 */
export function resolveEffectiveTimezone(configuredTimezone: string, appTimezone?: string): string {
  const target = (configuredTimezone === 'auto' || !configuredTimezone) ? appTimezone : configuredTimezone;

  if (!target) {
    return 'UTC';
  }

  // 1. Direct label lookup in APP_LABEL_TO_IANA
  if (APP_LABEL_TO_IANA[target]) {
    return APP_LABEL_TO_IANA[target];
  }

  // 2. Direct check if target is already a valid IANA string
  if (isValidIanaTimezone(target)) {
    return target;
  }

  // 3. Fallback: try extracting city name from parentheses e.g. "(UTC-4) New York" -> "New York"
  const match = target.match(/\((?:UTC|GMT)[^)]*\)\s*(.+)/i);
  if (match && match[1]) {
    const city = match[1].trim();
    for (const [label, iana] of Object.entries(APP_LABEL_TO_IANA)) {
      if (label.toLowerCase().includes(city.toLowerCase())) {
        return iana;
      }
    }
  }

  return 'UTC';
}

// Cached DateTimeFormat instances for performance
const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dtfCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    });
    dtfCache.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * Converts a wall-clock calendar date and time in a specific IANA timezone into a UTC epoch timestamp (ms).
 * Correctly accounts for standard time, Daylight Saving Time (DST), and DST switch dates.
 *
 * @param year - Gregorian calendar year (e.g. 2026)
 * @param month - Calendar month (1-12)
 * @param day - Day of month (1-31)
 * @param hour - Hour in 24h format (0-23)
 * @param minute - Minute (0-59)
 * @param timeZone - Valid IANA timezone string
 */
export function wallClockToUtcTimestamp(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): number {
  // If timezone is UTC, straightforward Date.UTC calculation
  if (timeZone === 'UTC' || timeZone === 'Etc/UTC') {
    return Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  }

  const formatter = getDateTimeFormatter(timeZone);
  const targetWallClockMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  // Initial estimate treating local wall-clock as UTC
  let guess = targetWallClockMs;

  // Converge in 1-3 iterations to handle DST offset shifts
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(guess));
    let pYear = 0, pMonth = 0, pDay = 0, pHour = 0, pMinute = 0, pSecond = 0;

    for (const p of parts) {
      if (p.type === 'year') pYear = parseInt(p.value, 10);
      else if (p.type === 'month') pMonth = parseInt(p.value, 10);
      else if (p.type === 'day') pDay = parseInt(p.value, 10);
      else if (p.type === 'hour') {
        const h = parseInt(p.value, 10);
        pHour = h === 24 ? 0 : h;
      }
      else if (p.type === 'minute') pMinute = parseInt(p.value, 10);
      else if (p.type === 'second') pSecond = parseInt(p.value, 10) || 0;
    }

    const wallClockAtGuess = Date.UTC(pYear, pMonth - 1, pDay, pHour, pMinute, pSecond, 0);
    const diff = targetWallClockMs - wallClockAtGuess;

    if (diff === 0) {
      return guess;
    }
    guess += diff;
  }

  return guess;
}

/**
 * Decomposes a UTC epoch timestamp (ms) into local wall-clock parts in the given IANA timezone.
 */
export function utcTimestampToWallClock(timestamp: number, timeZone: string): WallClockParts {
  const formatter = getDateTimeFormatter(timeZone);
  const parts = formatter.formatToParts(new Date(timestamp));

  let year = 1970, month = 1, day = 1, hour = 0, minute = 0, second = 0;

  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    else if (p.type === 'month') month = parseInt(p.value, 10);
    else if (p.type === 'day') day = parseInt(p.value, 10);
    else if (p.type === 'hour') {
      const h = parseInt(p.value, 10);
      hour = h === 24 ? 0 : h;
    }
    else if (p.type === 'minute') minute = parseInt(p.value, 10);
    else if (p.type === 'second') second = parseInt(p.value, 10) || 0;
  }

  return { year, month, day, hour, minute, second };
}
