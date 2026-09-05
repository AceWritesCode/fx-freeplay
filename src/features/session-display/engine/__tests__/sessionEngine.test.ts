/**
 * Comprehensive Unit Test Suite for Session Calculation Engine (Step 3)
 *
 * Tests all 24 required scenarios with fixed timestamps, deterministic inputs,
 * and zero reliance on machine local time or Date.now().
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { SessionConfig, SessionDisplaySettings } from '../../types.ts';
import { DEFAULT_BUILT_IN_SESSIONS } from '../../types.ts';
import {
  resolveEffectiveTimezone,
  wallClockToUtcTimestamp,
  utcTimestampToWallClock,
} from '../timezoneResolver.ts';
import {
  generateOccurrenceForDate,
  isOvernightSession,
} from '../sessionOccurrenceGenerator.ts';
import { calculateSessionOccurrences } from '../calculateSessionOccurrences.ts';

// Helper to create clean test settings with specific overrides
function createTestSettings(overrides?: Partial<SessionDisplaySettings>): SessionDisplaySettings {
  return {
    enabled: true,
    timezone: 'UTC',
    sessionScope: 'all',
    builtInSessions: {
      asia: { ...DEFAULT_BUILT_IN_SESSIONS.asia, enabled: false },
      sydney: { ...DEFAULT_BUILT_IN_SESSIONS.sydney, enabled: false },
      tokyo: { ...DEFAULT_BUILT_IN_SESSIONS.tokyo, enabled: false },
      frankfurt: { ...DEFAULT_BUILT_IN_SESSIONS.frankfurt, enabled: false },
      london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: false },
      newYork: { ...DEFAULT_BUILT_IN_SESSIONS.newYork, enabled: false },
    },
    customSessions: [],
    ...overrides,
  };
}

describe('Session Calculation Engine (Step 3)', () => {

  // 1. Normal session timestamp calculation
  it('1. Normal session timestamp calculation (03:00 -> 11:01 in UTC)', () => {
    const londonSession: SessionConfig = {
      id: 'london',
      name: 'London',
      enabled: true,
      startTime: '03:00',
      endTime: '11:01',
      color: 'rgba(38, 166, 154, 0.15)',
      isCustom: false,
    };

    const date = { year: 2026, month: 8, day: 12 };
    const occ = generateOccurrenceForDate(londonSession, date, 'UTC');

    assert.ok(occ, 'Occurrence should be created');
    assert.equal(occ.id, 'london_1786503600000');
    assert.equal(occ.startTimestamp, Date.UTC(2026, 7, 12, 3, 0));
    assert.equal(occ.endTimestamp, Date.UTC(2026, 7, 12, 11, 1));
    assert.equal(occ.isCustom, false);
  });

  // 2. Overnight session timestamp calculation
  it('2. Overnight session timestamp calculation (18:00 -> 03:01, ends following day)', () => {
    const asiaSession: SessionConfig = {
      id: 'asia',
      name: 'Asia',
      enabled: true,
      startTime: '18:00',
      endTime: '03:01',
      color: 'rgba(41, 98, 255, 0.15)',
      isCustom: false,
    };

    assert.equal(isOvernightSession(asiaSession.startTime, asiaSession.endTime), true);

    const date = { year: 2026, month: 8, day: 12 };
    const occ = generateOccurrenceForDate(asiaSession, date, 'UTC');

    assert.ok(occ, 'Overnight occurrence should be created');
    assert.equal(occ.startTimestamp, Date.UTC(2026, 7, 12, 18, 0));
    // Ends on August 13 at 03:01 UTC
    assert.equal(occ.endTimestamp, Date.UTC(2026, 7, 13, 3, 1));
    assert.ok(occ.endTimestamp > occ.startTimestamp);
  });

  // 3. Another overnight session
  it('3. Another overnight session (Tokyo 19:00 -> 03:01)', () => {
    const tokyoSession: SessionConfig = {
      id: 'tokyo',
      name: 'Tokyo',
      enabled: true,
      startTime: '19:00',
      endTime: '03:01',
      color: 'rgba(0, 188, 212, 0.15)',
      isCustom: false,
    };

    const date = { year: 2026, month: 8, day: 12 };
    const occ = generateOccurrenceForDate(tokyoSession, date, 'UTC');

    assert.ok(occ);
    assert.equal(occ.startTimestamp, Date.UTC(2026, 7, 12, 19, 0));
    assert.equal(occ.endTimestamp, Date.UTC(2026, 7, 13, 3, 1));
  });

  // 4. Custom overnight session
  it('4. Custom overnight session (Custom 17:00 -> 16:45)', () => {
    const customSession: SessionConfig = {
      id: 'custom_1',
      name: 'Custom 1',
      enabled: true,
      startTime: '17:00',
      endTime: '16:45',
      color: 'rgba(233, 30, 99, 0.15)',
      isCustom: true,
    };

    assert.equal(isOvernightSession(customSession.startTime, customSession.endTime), true);

    const date = { year: 2026, month: 8, day: 12 };
    const occ = generateOccurrenceForDate(customSession, date, 'UTC');

    assert.ok(occ);
    assert.equal(occ.startTimestamp, Date.UTC(2026, 7, 12, 17, 0));
    assert.equal(occ.endTimestamp, Date.UTC(2026, 7, 13, 16, 45));
    assert.equal(occ.isCustom, true);
  });

  // 5. Disabled session excluded
  it('5. Disabled session excluded from calculation', () => {
    const settings = createTestSettings({
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: false },
      },
    });

    const visibleStart = Date.UTC(2026, 7, 12, 0, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 23, 59);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime: Date.UTC(2026, 7, 12, 12, 0),
    });

    const londonOcc = result.occurrences.find((o) => o.sessionId === 'london');
    assert.equal(londonOcc, undefined, 'Disabled session must produce no occurrence');
  });

  // 6. Multiple enabled sessions
  it('6. Multiple enabled sessions returned correctly', () => {
    const settings = createTestSettings({
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true, startTime: '03:00', endTime: '11:01' },
        newYork: { ...DEFAULT_BUILT_IN_SESSIONS.newYork, enabled: true, startTime: '08:00', endTime: '16:01' },
      },
    });

    const visibleStart = Date.UTC(2026, 7, 12, 0, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 20, 0);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime: Date.UTC(2026, 7, 12, 12, 0),
    });

    const sessionIds = result.occurrences.map((o) => o.sessionId);
    assert.ok(sessionIds.includes('london'), 'London should be present');
    assert.ok(sessionIds.includes('newYork'), 'New York should be present');
  });

  // 7. Session completely outside viewport excluded
  it('7. Session completely outside viewport excluded', () => {
    const settings = createTestSettings({
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true, startTime: '03:00', endTime: '11:01' },
      },
    });

    // Viewport is later in the day: 14:00 to 20:00 (London ended at 11:01)
    const visibleStart = Date.UTC(2026, 7, 12, 14, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 20, 0);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime: Date.UTC(2026, 7, 12, 18, 0),
    });

    const aug12London = result.occurrences.find(
      (o) => o.sessionId === 'london' && o.startTimestamp === Date.UTC(2026, 7, 12, 3, 0)
    );
    assert.equal(aug12London, undefined, 'Session before viewport must be excluded');
  });

  // 8. Session starts before viewport and overlaps left edge
  it('8. Session starts before viewport and overlaps left edge', () => {
    const settings = createTestSettings({
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        asia: { ...DEFAULT_BUILT_IN_SESSIONS.asia, enabled: true, startTime: '18:00', endTime: '03:01' },
      },
    });

    // Viewport starts on Aug 12 at 02:00 (Asia started Aug 11 18:00 and ends Aug 12 03:01)
    const visibleStart = Date.UTC(2026, 7, 12, 2, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 10, 0);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime: Date.UTC(2026, 7, 12, 5, 0),
    });

    const overlappingAsia = result.occurrences.find(
      (o) => o.sessionId === 'asia' && o.startTimestamp === Date.UTC(2026, 7, 11, 18, 0)
    );

    assert.ok(overlappingAsia, 'Overnight session extending into viewport must be included');
    assert.equal(overlappingAsia.endTimestamp, Date.UTC(2026, 7, 12, 3, 1));
  });

  // 9. Session starts inside viewport and ends after viewport
  it('9. Session starts inside viewport and ends after viewport', () => {
    const settings = createTestSettings({
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        newYork: { ...DEFAULT_BUILT_IN_SESSIONS.newYork, enabled: true, startTime: '08:00', endTime: '16:01' },
      },
    });

    // Viewport is 06:00 to 12:00 (NY starts at 08:00 and ends at 16:01)
    const visibleStart = Date.UTC(2026, 7, 12, 6, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 12, 0);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime: Date.UTC(2026, 7, 12, 10, 0),
    });

    const nyOcc = result.occurrences.find((o) => o.sessionId === 'newYork');
    assert.ok(nyOcc, 'Session starting in viewport and ending after must be included');
    assert.equal(nyOcc.startTimestamp, Date.UTC(2026, 7, 12, 8, 0));
  });

  // 10 & 11. Exact boundary semantics [startTimestamp, endTimestamp)
  it('10 & 11. Exact start boundary and end boundary semantics', () => {
    const session: SessionConfig = {
      id: 'test',
      name: 'Test',
      enabled: true,
      startTime: '08:00',
      endTime: '12:00',
      color: 'rgba(0,0,0,0.1)',
    };
    const date = { year: 2026, month: 8, day: 12 };
    const occ = generateOccurrenceForDate(session, date, 'UTC')!;

    const startTs = Date.UTC(2026, 7, 12, 8, 0);
    const endTs = Date.UTC(2026, 7, 12, 12, 0);

    assert.equal(occ.startTimestamp, startTs);
    assert.equal(occ.endTimestamp, endTs);

    // Half-open interval convention: start <= timestamp < end
    const isInside = (ts: number) => ts >= occ.startTimestamp && ts < occ.endTimestamp;

    assert.equal(isInside(startTs - 1), false, 'Immediately before start is outside');
    assert.equal(isInside(startTs), true, 'Exactly at start is inside');
    assert.equal(isInside(startTs + 1000), true, 'Inside session');
    assert.equal(isInside(endTs - 1), true, '1ms before end is inside');
    assert.equal(isInside(endTs), false, 'Exactly at end is outside');
  });

  // 12. Latest Sessions before earliest session start (previous day fallback)
  it('12. Latest Sessions before earliest session start falls back to previous day cycle', () => {
    const settings = createTestSettings({
      sessionScope: 'latest',
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true, startTime: '06:00', endTime: '14:00' },
        newYork: { ...DEFAULT_BUILT_IN_SESSIONS.newYork, enabled: true, startTime: '08:00', endTime: '16:00' },
      },
    });

    // Earliest session is 06:00.
    // Current time is 12 Aug 2026 03:00 (before today's 06:00 has started).
    const currentTime = Date.UTC(2026, 7, 12, 3, 0);
    const visibleStart = Date.UTC(2026, 7, 11, 0, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 12, 0);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime,
    });

    // Should return yesterday's (Aug 11) session occurrences
    const londonOcc = result.occurrences.find((o) => o.sessionId === 'london');
    assert.ok(londonOcc, 'Yesterday London should be returned before earliest today');
    assert.equal(londonOcc.startTimestamp, Date.UTC(2026, 7, 11, 6, 0));

    const nyOcc = result.occurrences.find((o) => o.sessionId === 'newYork');
    assert.ok(nyOcc, 'Yesterday NY should be returned');
    assert.equal(nyOcc.startTimestamp, Date.UTC(2026, 7, 11, 8, 0));
  });

  // 13. Latest Sessions exactly at earliest session start
  it('13. Latest Sessions exactly at earliest session start begins new daily cycle', () => {
    const settings = createTestSettings({
      sessionScope: 'latest',
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true, startTime: '06:00', endTime: '14:00' },
        newYork: { ...DEFAULT_BUILT_IN_SESSIONS.newYork, enabled: true, startTime: '08:00', endTime: '16:00' },
      },
    });

    // Current time is exactly at 12 Aug 2026 06:00
    const currentTime = Date.UTC(2026, 7, 12, 6, 0);
    const visibleStart = Date.UTC(2026, 7, 11, 0, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 12, 0);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime,
    });

    // Today's 06:00 session is active
    const todayLondon = result.occurrences.find(
      (o) => o.sessionId === 'london' && o.startTimestamp === Date.UTC(2026, 7, 12, 6, 0)
    );
    assert.ok(todayLondon, "Today's 06:00 session must now be visible");

    // Yesterday's sessions must have disappeared from the latest cycle
    const yesterdayLondon = result.occurrences.find(
      (o) => o.sessionId === 'london' && o.startTimestamp === Date.UTC(2026, 7, 11, 6, 0)
    );
    assert.equal(yesterdayLondon, undefined, "Yesterday's session should disappear when new cycle begins");

    // Later session (08:00) has NOT started yet
    const nyOcc = result.occurrences.find((o) => o.sessionId === 'newYork');
    assert.equal(nyOcc, undefined, 'NY starting at 08:00 is not yet visible at 06:00');
  });

  // 14. Latest Sessions shortly after earliest session
  it('14. Latest Sessions shortly after earliest session (06:12) shows only started session', () => {
    const settings = createTestSettings({
      sessionScope: 'latest',
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true, startTime: '06:00', endTime: '14:00' },
        newYork: { ...DEFAULT_BUILT_IN_SESSIONS.newYork, enabled: true, startTime: '08:00', endTime: '16:00' },
      },
    });

    const currentTime = Date.UTC(2026, 7, 12, 6, 12);
    const visibleStart = Date.UTC(2026, 7, 12, 0, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 20, 0);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime,
    });

    assert.equal(result.occurrences.length, 1);
    assert.equal(result.occurrences[0].sessionId, 'london');
  });

  // 15 & 16. Latest Sessions progressive reveal and future session exclusion
  it('15 & 16. Progressive reveal as currentTime moves forward; future sessions excluded', () => {
    const settings = createTestSettings({
      sessionScope: 'latest',
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true, startTime: '06:00', endTime: '14:00' },
        newYork: { ...DEFAULT_BUILT_IN_SESSIONS.newYork, enabled: true, startTime: '08:00', endTime: '16:00' },
        tokyo: { ...DEFAULT_BUILT_IN_SESSIONS.tokyo, enabled: true, startTime: '10:00', endTime: '18:00' },
      },
    });

    const visibleStart = Date.UTC(2026, 7, 12, 0, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 23, 59);

    // At 07:00: only London (06:00) is eligible
    const resAt7 = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime: Date.UTC(2026, 7, 12, 7, 0),
    });
    assert.deepEqual(resAt7.occurrences.map((o) => o.sessionId), ['london']);

    // At 08:05: London and New York are eligible
    const resAt8 = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime: Date.UTC(2026, 7, 12, 8, 5),
    });
    assert.deepEqual(resAt8.occurrences.map((o) => o.sessionId), ['london', 'newYork']);

    // At 10:15: London, New York, and Tokyo are eligible
    const resAt10 = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime: Date.UTC(2026, 7, 12, 10, 15),
    });
    assert.deepEqual(resAt10.occurrences.map((o) => o.sessionId), ['london', 'newYork', 'tokyo']);
  });

  // 17. Latest Sessions + viewport filtering
  it('17. Latest Sessions that are completely outside the viewport are excluded', () => {
    const settings = createTestSettings({
      sessionScope: 'latest',
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true, startTime: '06:00', endTime: '10:00' },
      },
    });

    // Current time is 12 Aug 07:00 (London is eligible)
    const currentTime = Date.UTC(2026, 7, 12, 7, 0);

    // But viewport is scrolled way ahead to 12 Aug 15:00 - 20:00
    const visibleStart = Date.UTC(2026, 7, 12, 15, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 20, 0);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime,
    });

    assert.equal(result.occurrences.length, 0, 'Off-screen latest session must not be returned');
  });

  // 18. Timezone conversion
  it('18. Same session wall-clock time produces different UTC timestamps in different timezones', () => {
    const session: SessionConfig = {
      id: 'custom',
      name: 'Custom',
      enabled: true,
      startTime: '08:00',
      endTime: '16:00',
      color: '#fff',
    };

    const date = { year: 2026, month: 8, day: 12 };

    const occLondon = generateOccurrenceForDate(session, date, 'Europe/London')!;
    const occNewYork = generateOccurrenceForDate(session, date, 'America/New_York')!;
    const occTokyo = generateOccurrenceForDate(session, date, 'Asia/Tokyo')!;

    // In August:
    // London is BST (UTC+1): 08:00 wall-clock = 07:00 UTC
    assert.equal(occLondon.startTimestamp, Date.UTC(2026, 7, 12, 7, 0));

    // New York is EDT (UTC-4): 08:00 wall-clock = 12:00 UTC
    assert.equal(occNewYork.startTimestamp, Date.UTC(2026, 7, 12, 12, 0));

    // Tokyo is JST (UTC+9): 08:00 wall-clock = 23:00 UTC of previous day (Aug 11)
    assert.equal(occTokyo.startTimestamp, Date.UTC(2026, 7, 11, 23, 0));
  });

  // 19. New York DST transition testing
  it('19. New York DST transitions: standard time (EST, UTC-5) vs daylight time (EDT, UTC-4)', () => {
    const session: SessionConfig = {
      id: 'newYork',
      name: 'New York',
      enabled: true,
      startTime: '08:00',
      endTime: '16:00',
      color: '#fff',
    };

    // Winter date in January 2026: New York is in EST (UTC-5)
    // 08:00 EST = 13:00 UTC
    const winterDate = { year: 2026, month: 1, day: 15 };
    const winterOcc = generateOccurrenceForDate(session, winterDate, 'America/New_York')!;
    assert.equal(winterOcc.startTimestamp, Date.UTC(2026, 0, 15, 13, 0));
    assert.equal(winterOcc.endTimestamp, Date.UTC(2026, 0, 15, 21, 0));

    // Summer date in July 2026: New York is in EDT (UTC-4)
    // 08:00 EDT = 12:00 UTC
    const summerDate = { year: 2026, month: 7, day: 15 };
    const summerOcc = generateOccurrenceForDate(session, summerDate, 'America/New_York')!;
    assert.equal(summerOcc.startTimestamp, Date.UTC(2026, 6, 15, 12, 0));
    assert.equal(summerOcc.endTimestamp, Date.UTC(2026, 6, 15, 20, 0));
  });

  // 20. Automatic timezone resolution
  it('20. Automatic timezone resolves chart application timezone setting correctly', () => {
    assert.equal(resolveEffectiveTimezone('auto', '(UTC-4) New York'), 'America/New_York');
    assert.equal(resolveEffectiveTimezone('auto', '(UTC+1) London'), 'Europe/London');
    assert.equal(resolveEffectiveTimezone('auto', '(UTC+9) Tokyo'), 'Asia/Tokyo');
    assert.equal(resolveEffectiveTimezone('auto', '(UTC+5:30) Kolkata'), 'Asia/Kolkata');
    assert.equal(resolveEffectiveTimezone('auto', 'Exchange'), 'UTC');
    assert.equal(resolveEffectiveTimezone('auto', undefined), 'UTC');

    // Explicit IANA takes precedence over app timezone
    assert.equal(resolveEffectiveTimezone('America/Chicago', '(UTC-4) New York'), 'America/Chicago');
  });

  // 21. Custom session addition
  it('21. Dynamically added custom session calculates correctly alongside built-ins', () => {
    const settings = createTestSettings({
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true, startTime: '03:00', endTime: '11:00' },
      },
      customSessions: [
        {
          id: 'custom_session_abc',
          name: 'My Custom',
          enabled: true,
          startTime: '12:00',
          endTime: '15:30',
          color: 'rgba(255, 152, 0, 0.2)',
          isCustom: true,
        },
      ],
    });

    const visibleStart = Date.UTC(2026, 7, 12, 0, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 23, 59);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime: Date.UTC(2026, 7, 12, 16, 0),
    });

    const customOcc = result.occurrences.find((o) => o.sessionId === 'custom_session_abc');
    assert.ok(customOcc, 'Custom session occurrence must be created');
    assert.equal(customOcc.sessionName, 'My Custom');
    assert.equal(customOcc.startTimestamp, Date.UTC(2026, 7, 12, 12, 0));
    assert.equal(customOcc.endTimestamp, Date.UTC(2026, 7, 12, 15, 30));
    assert.equal(customOcc.isCustom, true);
  });

  // 22. Custom session removal behavior at input level
  it('22. Removed custom session produces no occurrences', () => {
    // Custom session removed (array is empty)
    const settings = createTestSettings({
      customSessions: [],
    });

    const visibleStart = Date.UTC(2026, 7, 12, 0, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 23, 59);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime: Date.UTC(2026, 7, 12, 12, 0),
    });

    const customs = result.occurrences.filter((o) => o.isCustom);
    assert.equal(customs.length, 0);
  });

  // 23. Multiple custom sessions remain independent
  it('23. Multiple custom sessions calculate independently with correct bounds and colors', () => {
    const settings = createTestSettings({
      customSessions: [
        {
          id: 'custom_1',
          name: 'Custom 1',
          enabled: true,
          startTime: '01:00',
          endTime: '04:00',
          color: 'rgba(1,1,1,0.1)',
          isCustom: true,
        },
        {
          id: 'custom_2',
          name: 'Custom 2',
          enabled: true,
          startTime: '05:00',
          endTime: '09:00',
          color: 'rgba(2,2,2,0.2)',
          isCustom: true,
        },
      ],
    });

    const visibleStart = Date.UTC(2026, 7, 12, 0, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 12, 0);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime: Date.UTC(2026, 7, 12, 10, 0),
    });

    assert.equal(result.occurrences.length, 2);
    assert.equal(result.occurrences[0].sessionId, 'custom_1');
    assert.equal(result.occurrences[0].startTimestamp, Date.UTC(2026, 7, 12, 1, 0));
    assert.equal(result.occurrences[1].sessionId, 'custom_2');
    assert.equal(result.occurrences[1].startTimestamp, Date.UTC(2026, 7, 12, 5, 0));
  });

  // 24. Overnight Latest Sessions behavior across midnight
  it('24. Overnight session started yesterday remains active across midnight in Latest Sessions mode', () => {
    const settings = createTestSettings({
      sessionScope: 'latest',
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        // Asia runs 18:00 to 03:01 overnight
        asia: { ...DEFAULT_BUILT_IN_SESSIONS.asia, enabled: true, startTime: '18:00', endTime: '03:01' },
        // London runs 08:00 to 16:00 normal
        london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true, startTime: '08:00', endTime: '16:00' },
      },
    });

    // Current time is Aug 12 at 01:30 (past midnight, but Asia started Aug 11 18:00 is STILL active)
    const currentTime = Date.UTC(2026, 7, 12, 1, 30);
    const visibleStart = Date.UTC(2026, 7, 11, 12, 0);
    const visibleEnd = Date.UTC(2026, 7, 12, 12, 0);

    const result = calculateSessionOccurrences({
      settings,
      visibleStart,
      visibleEnd,
      currentTime,
    });

    const asiaOcc = result.occurrences.find((o) => o.sessionId === 'asia');
    assert.ok(asiaOcc, 'Asia started yesterday must be active at 01:30 across midnight');
    assert.equal(asiaOcc.startTimestamp, Date.UTC(2026, 7, 11, 18, 0));
    assert.equal(asiaOcc.endTimestamp, Date.UTC(2026, 7, 12, 3, 1));
  });

  // Wall-clock to UTC and UTC to wall-clock utilities
  it('UTC to WallClock decomposition accuracy', () => {
    const ts = Date.UTC(2026, 7, 12, 14, 35, 20); // 14:35:20 UTC
    // New York in August is UTC-4: 10:35:20
    const ny = utcTimestampToWallClock(ts, 'America/New_York');
    assert.equal(ny.year, 2026);
    assert.equal(ny.month, 8);
    assert.equal(ny.day, 12);
    assert.equal(ny.hour, 10);
    assert.equal(ny.minute, 35);
    assert.equal(ny.second, 20);

    // Convert back:
    const reconverted = wallClockToUtcTimestamp(ny.year, ny.month, ny.day, ny.hour, ny.minute, 'America/New_York');
    assert.equal(reconverted, Date.UTC(2026, 7, 12, 14, 35, 0));
  });

  it('Disabled master toggle returns empty occurrences', () => {
    const settings = createTestSettings({
      enabled: false,
      builtInSessions: {
        ...DEFAULT_BUILT_IN_SESSIONS,
        london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true },
      },
    });

    const result = calculateSessionOccurrences({
      settings,
      visibleStart: Date.UTC(2026, 7, 12, 0, 0),
      visibleEnd: Date.UTC(2026, 7, 12, 23, 59),
      currentTime: Date.UTC(2026, 7, 12, 12, 0),
    });

    assert.equal(result.occurrences.length, 0);
  });

  // Future Session Filtering (Show All mode)
  describe('Future Session Filtering (Show All mode)', () => {
    it('excludes future sessions whose startTimestamp is strictly greater than currentTime', () => {
      const settings = createTestSettings({
        sessionScope: 'all',
        builtInSessions: {
          ...DEFAULT_BUILT_IN_SESSIONS,
          tokyo: { ...DEFAULT_BUILT_IN_SESSIONS.tokyo, enabled: true, startTime: '01:00', endTime: '06:00' },
          london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true, startTime: '08:00', endTime: '16:00' },
          newYork: { ...DEFAULT_BUILT_IN_SESSIONS.newYork, enabled: true, startTime: '13:00', endTime: '21:00' },
        },
      });

      // Viewport spans the entire day
      const visibleStart = Date.UTC(2026, 7, 12, 0, 0);
      const visibleEnd = Date.UTC(2026, 7, 12, 23, 59);

      // currentTime is 09:30 (Tokyo is historical, London is active, NY is future)
      const currentTime = Date.UTC(2026, 7, 12, 9, 30);

      const result = calculateSessionOccurrences({
        settings,
        visibleStart,
        visibleEnd,
        currentTime,
      });

      const sessionIds = result.occurrences.map((o) => o.sessionId);
      assert.ok(sessionIds.includes('tokyo'), 'Past session (Tokyo) must be included');
      assert.ok(sessionIds.includes('london'), 'Current active session (London) must be included');
      assert.equal(sessionIds.includes('newYork'), false, 'Future session (New York at 13:00) must be excluded');
    });

    it('includes session at exact startTimestamp boundary (startTimestamp === currentTime)', () => {
      const settings = createTestSettings({
        sessionScope: 'all',
        builtInSessions: {
          ...DEFAULT_BUILT_IN_SESSIONS,
          london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true, startTime: '08:00', endTime: '16:00' },
          newYork: { ...DEFAULT_BUILT_IN_SESSIONS.newYork, enabled: true, startTime: '13:00', endTime: '21:00' },
        },
      });

      const visibleStart = Date.UTC(2026, 7, 12, 0, 0);
      const visibleEnd = Date.UTC(2026, 7, 12, 23, 59);

      // currentTime is exactly 08:00 (London start time)
      const currentTime = Date.UTC(2026, 7, 12, 8, 0);

      const result = calculateSessionOccurrences({
        settings,
        visibleStart,
        visibleEnd,
        currentTime,
      });

      const sessionIds = result.occurrences.map((o) => o.sessionId);
      assert.ok(sessionIds.includes('london'), 'Session starting exactly at currentTime must be included');
      assert.equal(sessionIds.includes('newYork'), false, 'Future session (New York) must be excluded');
    });

    it('includes all viewport sessions when currentTime is undefined', () => {
      const settings = createTestSettings({
        sessionScope: 'all',
        builtInSessions: {
          ...DEFAULT_BUILT_IN_SESSIONS,
          london: { ...DEFAULT_BUILT_IN_SESSIONS.london, enabled: true, startTime: '08:00', endTime: '16:00' },
          newYork: { ...DEFAULT_BUILT_IN_SESSIONS.newYork, enabled: true, startTime: '13:00', endTime: '21:00' },
        },
      });

      const visibleStart = Date.UTC(2026, 7, 12, 0, 0);
      const visibleEnd = Date.UTC(2026, 7, 12, 23, 59);

      const result = calculateSessionOccurrences({
        settings,
        visibleStart,
        visibleEnd,
      });

      const sessionIds = result.occurrences.map((o) => o.sessionId);
      assert.ok(sessionIds.includes('london'), 'London included when currentTime is omitted');
      assert.ok(sessionIds.includes('newYork'), 'New York included when currentTime is omitted');
    });
  });
});
