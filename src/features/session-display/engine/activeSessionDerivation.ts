/**
 * activeSessionDerivation.ts
 *
 * Pure, deterministic engine utilities for deriving currently active sessions
 * and candle-based countdown time remaining.
 *
 * CRITICAL ARCHITECTURAL RULES:
 * 1. A session is active if and only if:
 *    session.startTimestamp <= currentCandleTime < session.endTimestamp
 * 2. Countdown is derived strictly from chart candle time:
 *    remainingMs = session.endTimestamp - currentCandleTime
 *    NO Date.now(), system wall-clock, or artificial setInterval timers.
 * 3. Deterministic ordering:
 *    Sorted chronologically by startTimestamp, then by sessionId.
 */

import type { SessionOccurrence } from '../types.ts';

export interface ActiveSessionInfo {
  occurrence: SessionOccurrence;
  remainingMs: number;
  formattedRemaining: string;
}

/**
 * Formats a millisecond duration into standard "HH:MM:SS" format.
 * Zero-pads hours, minutes, and seconds. Safe for durations >= 24 hours.
 */
export function formatDurationHMS(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '00:00:00';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Converts a potentially translucent color (e.g. rgba(r, g, b, 0.15)) into an opaque
 * color suitable for status dots and badges.
 */
export function getOpaqueColor(color: string): string {
  if (!color || typeof color !== 'string') {
    return '#3b82f6';
  }

  const trimmed = color.trim();
  const rgbaMatch = trimmed.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)$/i);
  if (rgbaMatch) {
    return `rgb(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]})`;
  }

  return trimmed;
}

/**
 * Derives currently active sessions given a list of occurrences and the authoritative currentCandleTime.
 *
 * @param occurrences - Array of session occurrences (from calculateSessionOccurrences)
 * @param currentCandleTime - Timestamp of the authoritative current candle bar (UTC ms)
 * @returns Sorted array of active session info objects with calculated remaining time
 */
export function getActiveSessions(
  occurrences: SessionOccurrence[],
  currentCandleTime: number
): ActiveSessionInfo[] {
  if (!Array.isArray(occurrences) || occurrences.length === 0 || !Number.isFinite(currentCandleTime)) {
    return [];
  }

  const active: ActiveSessionInfo[] = [];

  for (const occ of occurrences) {
    // Half-open interval: [startTimestamp, endTimestamp)
    if (occ.startTimestamp <= currentCandleTime && currentCandleTime < occ.endTimestamp) {
      const remainingMs = Math.max(0, occ.endTimestamp - currentCandleTime);
      active.push({
        occurrence: occ,
        remainingMs,
        formattedRemaining: formatDurationHMS(remainingMs),
      });
    }
  }

  // Deterministic order: chronologically by startTimestamp, then sessionId
  active.sort(
    (a, b) =>
      a.occurrence.startTimestamp - b.occurrence.startTimestamp ||
      a.occurrence.sessionId.localeCompare(b.occurrence.sessionId)
  );

  return active;
}
