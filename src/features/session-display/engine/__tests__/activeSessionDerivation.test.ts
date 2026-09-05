/**
 * Unit Test Suite for Active Session Derivation and Countdown
 *
 * Tests all active session conditions, boundaries, duration formatting,
 * color opacity extraction, and multi-session sorting.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { SessionOccurrence } from '../../types.ts';
import {
  formatDurationHMS,
  getOpaqueColor,
  getActiveSessions,
} from '../activeSessionDerivation.ts';

describe('Active Session Derivation', () => {

  describe('formatDurationHMS', () => {
    it('handles 0, negative, and invalid values safely', () => {
      assert.equal(formatDurationHMS(0), '00:00:00');
      assert.equal(formatDurationHMS(-1000), '00:00:00');
      assert.equal(formatDurationHMS(NaN), '00:00:00');
      assert.equal(formatDurationHMS(Infinity), '00:00:00');
    });

    it('formats seconds only', () => {
      assert.equal(formatDurationHMS(45 * 1000), '00:00:45');
      assert.equal(formatDurationHMS(9 * 1000), '00:00:09');
    });

    it('formats minutes and seconds', () => {
      assert.equal(formatDurationHMS((2 * 60 + 5) * 1000), '00:02:05');
      assert.equal(formatDurationHMS((59 * 60 + 59) * 1000), '00:59:59');
    });

    it('formats hours, minutes, and seconds', () => {
      assert.equal(formatDurationHMS((1 * 3600 + 1 * 60 + 1) * 1000), '01:01:01');
      assert.equal(formatDurationHMS((8 * 3600 + 30 * 60 + 15) * 1000), '08:30:15');
      assert.equal(formatDurationHMS(24 * 3600 * 1000), '24:00:00');
    });

    it('handles hours >= 100 without truncation', () => {
      assert.equal(formatDurationHMS(100 * 3600 * 1000), '100:00:00');
    });
  });

  describe('getOpaqueColor', () => {
    it('converts rgba with alpha to solid rgb', () => {
      assert.equal(getOpaqueColor('rgba(38, 166, 154, 0.15)'), 'rgb(38, 166, 154)');
      assert.equal(getOpaqueColor('rgba(41, 98, 255, 0.2)'), 'rgb(41, 98, 255)');
    });

    it('preserves hex and existing rgb colors', () => {
      assert.equal(getOpaqueColor('#2962ff'), '#2962ff');
      assert.equal(getOpaqueColor('rgb(10, 20, 30)'), 'rgb(10, 20, 30)');
    });

    it('returns default fallback for empty input', () => {
      assert.equal(getOpaqueColor(''), '#3b82f6');
    });
  });

  describe('getActiveSessions', () => {
    const londonOcc: SessionOccurrence = {
      id: 'london_1000',
      sessionId: 'london',
      sessionName: 'London',
      startTimestamp: 10000,
      endTimestamp: 20000,
      color: 'rgba(38, 166, 154, 0.15)',
      isCustom: false,
    };

    const newYorkOcc: SessionOccurrence = {
      id: 'newYork_15000',
      sessionId: 'newYork',
      sessionName: 'New York',
      startTimestamp: 15000,
      endTimestamp: 25000,
      color: 'rgba(255, 152, 0, 0.15)',
      isCustom: false,
    };

    it('returns empty array when occurrences are empty or candle time is invalid', () => {
      assert.deepEqual(getActiveSessions([], 12000), []);
      assert.deepEqual(getActiveSessions([londonOcc], NaN), []);
    });

    it('identifies single active session and calculates remaining time correctly', () => {
      const active = getActiveSessions([londonOcc], 12000);
      assert.equal(active.length, 1);
      assert.equal(active[0].occurrence.sessionId, 'london');
      assert.equal(active[0].remainingMs, 8000);
      assert.equal(active[0].formattedRemaining, '00:00:08');
    });

    it('includes session at exact start boundary (currentCandleTime === startTimestamp)', () => {
      const active = getActiveSessions([londonOcc], 10000);
      assert.equal(active.length, 1);
      assert.equal(active[0].remainingMs, 10000);
      assert.equal(active[0].formattedRemaining, '00:00:10');
    });

    it('excludes session at exact end boundary (currentCandleTime === endTimestamp)', () => {
      const active = getActiveSessions([londonOcc], 20000);
      assert.equal(active.length, 0, 'Exact end timestamp must be outside the active window');
    });

    it('excludes session when candle is before start or after end', () => {
      assert.equal(getActiveSessions([londonOcc], 9999).length, 0);
      assert.equal(getActiveSessions([londonOcc], 20001).length, 0);
    });

    it('handles overlapping concurrent active sessions with deterministic ordering', () => {
      // At timestamp 17000: London (10000-20000) and NY (15000-25000) are BOTH active
      const active = getActiveSessions([newYorkOcc, londonOcc], 17000);
      assert.equal(active.length, 2);

      // Deterministic sort: London starts first (10000 < 15000)
      assert.equal(active[0].occurrence.sessionId, 'london');
      assert.equal(active[0].remainingMs, 3000); // 20000 - 17000
      assert.equal(active[0].formattedRemaining, '00:00:03');

      assert.equal(active[1].occurrence.sessionId, 'newYork');
      assert.equal(active[1].remainingMs, 8000); // 25000 - 17000
      assert.equal(active[1].formattedRemaining, '00:00:08');
    });

    it('handles overnight session crossing midnight', () => {
      const asiaOvernight: SessionOccurrence = {
        id: 'asia_overnight',
        sessionId: 'asia',
        sessionName: 'Asia',
        // Starts Aug 11 at 18:00 UTC, ends Aug 12 at 03:00 UTC (9 hours)
        startTimestamp: Date.UTC(2026, 7, 11, 18, 0),
        endTimestamp: Date.UTC(2026, 7, 12, 3, 0),
        color: 'rgba(41, 98, 255, 0.15)',
        isCustom: false,
      };

      // Candle is on Aug 12 at 01:30 UTC (past midnight, 1.5 hours remaining)
      const currentCandle = Date.UTC(2026, 7, 12, 1, 30);
      const active = getActiveSessions([asiaOvernight], currentCandle);

      assert.equal(active.length, 1);
      assert.equal(active[0].occurrence.sessionId, 'asia');
      assert.equal(active[0].remainingMs, 90 * 60 * 1000); // 1.5 hours
      assert.equal(active[0].formattedRemaining, '01:30:00');
    });

    it('handles custom session alongside built-in session', () => {
      const customOcc: SessionOccurrence = {
        id: 'custom_123',
        sessionId: 'custom_123',
        sessionName: 'My Custom',
        startTimestamp: 10000,
        endTimestamp: 20000,
        color: '#e91e63',
        isCustom: true,
      };

      const active = getActiveSessions([customOcc], 15000);
      assert.equal(active.length, 1);
      assert.equal(active[0].occurrence.isCustom, true);
      assert.equal(active[0].occurrence.sessionName, 'My Custom');
      assert.equal(active[0].remainingMs, 5000);
    });
  });
});
