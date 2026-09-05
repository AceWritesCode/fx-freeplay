/**
 * Main public entrypoint for the Session Calculation Engine.
 *
 * Coordinates:
 * 1. Timezone resolution (auto vs explicit IANA).
 * 2. Session extraction and enabled-state filtering.
 * 3. Scope-based calculation (all sessions in viewport vs progressive latest sessions).
 * 4. Half-open interval viewport overlap [visibleStart, visibleEnd).
 * 5. Deterministic sorting and deduplication.
 */

import type {
  CalculateSessionsParams,
  SessionCalculationResult,
  SessionConfig,
  SessionOccurrence,
} from '../types.ts';
import { BUILT_IN_SESSION_IDS } from '../types.ts';
import { resolveEffectiveTimezone } from './timezoneResolver.ts';
import { calculateViewportSessions } from './sessionOccurrenceGenerator.ts';
import { calculateLatestSessions } from './latestSessionFilter.ts';

export function calculateSessionOccurrences(
  params: CalculateSessionsParams
): SessionCalculationResult {
  const { settings, visibleStart, visibleEnd, currentTime, appTimezone } = params;

  // 1. If master switch is disabled, return empty occurrences
  if (!settings || !settings.enabled) {
    return {
      occurrences: [],
      effectiveTimezone: 'UTC',
      scope: settings?.sessionScope || 'all',
    };
  }

  // 2. Resolve effective IANA timezone (handling 'auto', application labels, and explicit IANA)
  const effectiveTimezone = resolveEffectiveTimezone(settings.timezone, appTimezone);

  // 3. Extract all enabled sessions (built-in + custom)
  const enabledSessions: SessionConfig[] = [];

  if (settings.builtInSessions) {
    for (const id of BUILT_IN_SESSION_IDS) {
      const s = settings.builtInSessions[id];
      if (s && s.enabled) {
        enabledSessions.push(s);
      }
    }
  }

  if (Array.isArray(settings.customSessions)) {
    for (const s of settings.customSessions) {
      if (s && s.enabled) {
        enabledSessions.push(s);
      }
    }
  }

  // If no sessions are enabled, return early
  if (enabledSessions.length === 0 || visibleEnd <= visibleStart) {
    return {
      occurrences: [],
      effectiveTimezone,
      scope: settings.sessionScope || 'all',
    };
  }

  const scope = settings.sessionScope || 'all';

  // 4. Calculate occurrences based on scope
  let occurrences: SessionOccurrence[];

  if (scope === 'latest') {
    occurrences = calculateLatestSessions({
      enabledSessions,
      effectiveTimezone,
      currentTime,
      visibleStart,
      visibleEnd,
    });
  } else {
    occurrences = calculateViewportSessions({
      enabledSessions,
      effectiveTimezone,
      visibleStart,
      visibleEnd,
    });
  }

  return {
    occurrences,
    effectiveTimezone,
    scope,
  };
}
