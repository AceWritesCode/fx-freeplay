import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANDLES_SENTINEL,
  calculateZLevelsFromSequence,
} from '../../engine/charting/orderEngine.ts';

describe('Phase 2C-1 — Pure Canonical Sequence to Z-Level Projection', () => {
  it('handles empty sequence gracefully', () => {
    const result = calculateZLevelsFromSequence([]);
    assert.equal(result.size, 0);
  });

  it('handles sequence containing only the candles sentinel', () => {
    const result = calculateZLevelsFromSequence([CANDLES_SENTINEL]);
    assert.equal(result.size, 0);
  });

  it('projects single drawing correctly', () => {
    const result = calculateZLevelsFromSequence(['d1', CANDLES_SENTINEL]);
    assert.equal(result.size, 1);
    assert.equal(result.get('d1'), 10);
  });

  it('projects single drawing with custom base zLevel', () => {
    const result = calculateZLevelsFromSequence(['d1'], { baseZLevel: 100 });
    assert.equal(result.size, 1);
    assert.equal(result.get('d1'), 100);
  });

  it('projects multiple drawings with strict descending order (index 0 = highest zLevel)', () => {
    const sequence = ['d1', 'd2', 'd3', 'd4'];
    const result = calculateZLevelsFromSequence(sequence);

    assert.equal(result.size, 4);
    assert.equal(result.get('d1'), 40);
    assert.equal(result.get('d2'), 30);
    assert.equal(result.get('d3'), 20);
    assert.equal(result.get('d4'), 10);

    assert.ok(result.get('d1')! > result.get('d2')!);
    assert.ok(result.get('d2')! > result.get('d3')!);
    assert.ok(result.get('d3')! > result.get('d4')!);
  });

  it('ignores candles sentinel at the beginning', () => {
    const sequence = [CANDLES_SENTINEL, 'd1', 'd2'];
    const result = calculateZLevelsFromSequence(sequence);

    assert.equal(result.size, 2);
    assert.equal(result.has(CANDLES_SENTINEL), false);
    assert.equal(result.get('d1'), 20);
    assert.equal(result.get('d2'), 10);
  });

  it('ignores candles sentinel in the middle', () => {
    const sequence = ['d1', 'd2', CANDLES_SENTINEL, 'd3', 'd4'];
    const result = calculateZLevelsFromSequence(sequence);

    assert.equal(result.size, 4);
    assert.equal(result.has(CANDLES_SENTINEL), false);
    assert.equal(result.get('d1'), 40);
    assert.equal(result.get('d2'), 30);
    assert.equal(result.get('d3'), 20);
    assert.equal(result.get('d4'), 10);
  });

  it('ignores candles sentinel at the end', () => {
    const sequence = ['d1', 'd2', CANDLES_SENTINEL];
    const result = calculateZLevelsFromSequence(sequence);

    assert.equal(result.size, 2);
    assert.equal(result.has(CANDLES_SENTINEL), false);
    assert.equal(result.get('d1'), 20);
    assert.equal(result.get('d2'), 10);
  });

  it('supports custom baseZLevel and stride', () => {
    const sequence = ['dA', 'dB', 'dC'];
    const result = calculateZLevelsFromSequence(sequence, { baseZLevel: 50, stride: 25 });

    assert.equal(result.size, 3);
    assert.equal(result.get('dA'), 100);
    assert.equal(result.get('dB'), 75);
    assert.equal(result.get('dC'), 50);
  });

  it('is strictly deterministic: identical sequence produces identical mapping', () => {
    const sequence = ['top', 'middle', CANDLES_SENTINEL, 'bottom'];
    const run1 = calculateZLevelsFromSequence(sequence);
    const run2 = calculateZLevelsFromSequence(sequence);

    assert.deepEqual(Array.from(run1.entries()), Array.from(run2.entries()));
  });

  it('never mutates the input sequence array', () => {
    const original = Object.freeze(['d1', 'd2', CANDLES_SENTINEL, 'd3']);
    const copy = [...original];

    const result = calculateZLevelsFromSequence(copy);
    assert.deepEqual(copy, original);
    assert.equal(result.size, 3);
  });
});
