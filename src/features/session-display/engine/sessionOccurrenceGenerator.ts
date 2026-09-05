/**
 * Session occurrence generator for the Session Display engine.
 * Calculates exact start and end timestamps for normal and overnight sessions
 * across calendar days in the effective timezone.
 */

import type { SessionConfig, SessionOccurrence } from '../types.ts';
import { utcTimestampToWallClock, wallClockToUtcTimestamp } from './timezoneResolver.ts';

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

/**
 * Parses a "HH:mm" time string into numeric hours and minutes.
 */
export function parseTime(timeStr: string): { hour: number; minute: number } {
  if (!timeStr || typeof timeStr !== 'string') {
    return { hour: 0, minute: 0 };
  }
  const parts = timeStr.trim().split(':');
  const hour = parseInt(parts[0], 10) || 0;
  const minute = parseInt(parts[1], 10) || 0;
  return {
    hour: Math.max(0, Math.min(23, hour)),
    minute: Math.max(0, Math.min(59, minute)),
  };
}

/**
 * Determines whether a session is an overnight session (i.e. spans across midnight into the next day).
 * A session is overnight if endTime <= startTime.
 */
export function isOvernightSession(startTime: string, endTime: string): boolean {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const startTotal = start.hour * 60 + start.minute;
  const endTotal = end.hour * 60 + end.minute;
  return endTotal <= startTotal;
}

/**
 * Calculates the calendar date immediately following the given date.
 */
export function getNextCalendarDate(date: CalendarDate): CalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

/**
 * Calculates the calendar date immediately preceding the given date.
 */
export function getPreviousCalendarDate(date: CalendarDate): CalendarDate {
  const prev = new Date(Date.UTC(date.year, date.month - 1, date.day - 1));
  return {
    year: prev.getUTCFullYear(),
    month: prev.getUTCMonth() + 1,
    day: prev.getUTCDate(),
  };
}

/**
 * Generates a single session occurrence starting on a given calendar date in the effective timezone.
 * Returns null if the session is disabled or has an invalid configuration.
 *
 * @param session - The session configuration
 * @param date - The calendar date on which the session starts
 * @param timeZone - The effective IANA timezone
 */
export function generateOccurrenceForDate(
  session: SessionConfig,
  date: CalendarDate,
  timeZone: string
): SessionOccurrence | null {
  if (!session.enabled) {
    return null;
  }

  const start = parseTime(session.startTime);
  const end = parseTime(session.endTime);

  const startMs = wallClockToUtcTimestamp(date.year, date.month, date.day, start.hour, start.minute, timeZone);

  let endMs: number;
  const overnight = isOvernightSession(session.startTime, session.endTime);

  if (overnight) {
    // Overnight session ends on the following calendar day
    const nextDate = getNextCalendarDate(date);
    endMs = wallClockToUtcTimestamp(nextDate.year, nextDate.month, nextDate.day, end.hour, end.minute, timeZone);
  } else {
    // Normal session ends on the same calendar day
    endMs = wallClockToUtcTimestamp(date.year, date.month, date.day, end.hour, end.minute, timeZone);
  }

  // Safety fallback for unexpected boundary collisions (e.g. extreme spring-forward DST edge cases)
  if (endMs <= startMs) {
    endMs = startMs + 60 * 1000;
  }

  return {
    id: `${session.id}_${startMs}`,
    sessionId: session.id,
    sessionName: session.name,
    startTimestamp: startMs,
    endTimestamp: endMs,
    color: session.color,
    isCustom: session.isCustom ?? false,
  };
}

/**
 * Calculates all session occurrences overlapping the visible chart viewport [visibleStart, visibleEnd).
 * Iterates only over the bounded calendar date range required by the viewport.
 */
export function calculateViewportSessions(params: {
  enabledSessions: SessionConfig[];
  effectiveTimezone: string;
  visibleStart: number;
  visibleEnd: number;
  currentTime?: number;
}): SessionOccurrence[] {
  const { enabledSessions, effectiveTimezone, visibleStart, visibleEnd, currentTime } = params;

  if (enabledSessions.length === 0 || visibleEnd <= visibleStart) {
    return [];
  }

  // Derive calendar date bounds from the viewport
  const startWallClock = utcTimestampToWallClock(visibleStart, effectiveTimezone);
  const endWallClock = utcTimestampToWallClock(visibleEnd, effectiveTimezone);

  // Buffer by 1 day before visibleStart to catch overnight sessions that started on day D-1
  // and 1 day after visibleEnd to catch sessions starting near visibleEnd
  const startDate = getPreviousCalendarDate({
    year: startWallClock.year,
    month: startWallClock.month,
    day: startWallClock.day,
  });

  const endDate = getNextCalendarDate({
    year: endWallClock.year,
    month: endWallClock.month,
    day: endWallClock.day,
  });

  const occurrences: SessionOccurrence[] = [];
  const seenIds = new Set<string>();

  // Iterate day by day across the bounded range
  let curUtc = Date.UTC(startDate.year, startDate.month - 1, startDate.day);
  const endUtc = Date.UTC(endDate.year, endDate.month - 1, endDate.day);

  while (curUtc <= endUtc) {
    const curDateObj = new Date(curUtc);
    const date: CalendarDate = {
      year: curDateObj.getUTCFullYear(),
      month: curDateObj.getUTCMonth() + 1,
      day: curDateObj.getUTCDate(),
    };

    for (const session of enabledSessions) {
      const occ = generateOccurrenceForDate(session, date, effectiveTimezone);
      if (occ) {
        // Half-open interval overlap: [occ.startTimestamp, occ.endTimestamp) overlaps [visibleStart, visibleEnd)
        if (occ.endTimestamp > visibleStart && occ.startTimestamp < visibleEnd) {
          // Never include sessions that start in the future relative to currentTime
          if (currentTime !== undefined && occ.startTimestamp > currentTime) {
            continue;
          }
          if (!seenIds.has(occ.id)) {
            seenIds.add(occ.id);
            occurrences.push(occ);
          }
        }
      }
    }

    // Advance by 1 calendar day
    curUtc += 24 * 60 * 60 * 1000;
  }

  // Sort chronologically by startTimestamp, then by sessionId for determinism
  occurrences.sort((a, b) => a.startTimestamp - b.startTimestamp || a.sessionId.localeCompare(b.sessionId));

  return occurrences;
}
