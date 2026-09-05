/**
 * Latest Sessions filtering logic for the Session Display engine.
 *
 * Requirements:
 * 1. Find earliest START TIME of the day among all enabled sessions.
 * 2. If currentTime < earliestSessionStart on current day:
 *    Fallback to previous day's session cycle so chart is never blank between midnight and first session.
 * 3. When currentTime reaches earliestSessionStart:
 *    Transition to today's cycle. Previous day's latest sessions disappear.
 * 4. Progressive reveal:
 *    Only return sessions that have already started by currentTime (occ.startTimestamp <= currentTime).
 *    Future sessions are NEVER returned even if they are inside the viewport.
 * 5. Overnight sessions:
 *    An overnight session from the preceding day that is still active (currentTime < endTimestamp)
 *    is preserved until its end time.
 * 6. Viewport clipping:
 *    Occurrences must still overlap [visibleStart, visibleEnd) to be returned.
 */

import type { SessionConfig, SessionOccurrence } from '../types.ts';
import { utcTimestampToWallClock } from './timezoneResolver.ts';
import type { CalendarDate } from './sessionOccurrenceGenerator.ts';
import {
  generateOccurrenceForDate,
  getPreviousCalendarDate,
  parseTime,
} from './sessionOccurrenceGenerator.ts';

export function calculateLatestSessions(params: {
  enabledSessions: SessionConfig[];
  effectiveTimezone: string;
  currentTime: number;
  visibleStart: number;
  visibleEnd: number;
}): SessionOccurrence[] {
  const { enabledSessions, effectiveTimezone, currentTime, visibleStart, visibleEnd } = params;

  if (enabledSessions.length === 0 || visibleEnd <= visibleStart) {
    return [];
  }

  // 1. Find the earliest start time of the day in minutes from midnight among enabled sessions
  let earliestMinute = Infinity;
  for (const session of enabledSessions) {
    const time = parseTime(session.startTime);
    const mins = time.hour * 60 + time.minute;
    if (mins < earliestMinute) {
      earliestMinute = mins;
    }
  }

  if (earliestMinute === Infinity) {
    return [];
  }

  // 2. Decompose currentTime into wall-clock in the effective timezone
  const currentWallClock = utcTimestampToWallClock(currentTime, effectiveTimezone);
  const currentMinute = currentWallClock.hour * 60 + currentWallClock.minute;

  const today: CalendarDate = {
    year: currentWallClock.year,
    month: currentWallClock.month,
    day: currentWallClock.day,
  };

  // 3. Determine the primary cycle date:
  // If current time is before the earliest session has started today, fall back to previous day
  const isBeforeEarliestToday = currentMinute < earliestMinute;
  const cycleDate: CalendarDate = isBeforeEarliestToday ? getPreviousCalendarDate(today) : today;

  const candidateOccurrences: SessionOccurrence[] = [];
  const seenIds = new Set<string>();

  // 4. Generate occurrences for the primary cycle date
  for (const session of enabledSessions) {
    const occ = generateOccurrenceForDate(session, cycleDate, effectiveTimezone);
    if (occ) {
      // Must have already started by currentTime (progressive reveal; no future sessions)
      if (occ.startTimestamp <= currentTime) {
        if (!seenIds.has(occ.id)) {
          seenIds.add(occ.id);
          candidateOccurrences.push(occ);
        }
      }
    }
  }

  // 5. Special overnight consideration:
  // If cycle date transitioned to today, check if any overnight session from yesterday is still actively running
  if (!isBeforeEarliestToday) {
    const yesterday = getPreviousCalendarDate(today);
    for (const session of enabledSessions) {
      const prevOcc = generateOccurrenceForDate(session, yesterday, effectiveTimezone);
      if (prevOcc) {
        // If it started yesterday and is still currently active (currentTime < endTimestamp)
        if (prevOcc.startTimestamp <= currentTime && currentTime < prevOcc.endTimestamp) {
          if (!seenIds.has(prevOcc.id)) {
            seenIds.add(prevOcc.id);
            candidateOccurrences.push(prevOcc);
          }
        }
      }
    }
  }

  // 6. Viewport clipping: ensure each candidate occurrence overlaps [visibleStart, visibleEnd)
  const visibleOccurrences = candidateOccurrences.filter((occ) => {
    return occ.endTimestamp > visibleStart && occ.startTimestamp < visibleEnd;
  });

  // 7. Sort chronologically by startTimestamp, then by sessionId for determinism
  visibleOccurrences.sort((a, b) => a.startTimestamp - b.startTimestamp || a.sessionId.localeCompare(b.sessionId));

  return visibleOccurrences;
}
