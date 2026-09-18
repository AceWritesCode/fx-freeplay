import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ReplayVisibilityBoundaryManager } from '../ReplayVisibilityBoundary';

describe('ReplayVisibilityBoundaryManager', () => {
  const mockData = [
    { timestamp: 1000, close: 10 },
    { timestamp: 2000, close: 20 },
    { timestamp: 3000, close: 30 },
    { timestamp: 4000, close: 40 },
    { timestamp: 5000, close: 50 },
  ];

  it('should default to inactive state where all timestamps are revealed', () => {
    const boundary = new ReplayVisibilityBoundaryManager();
    assert.equal(boundary.isActive(), false);
    assert.equal(boundary.getCurrentTimestamp(), null);
    assert.equal(boundary.isTimestampRevealed(3000), true);
    assert.equal(boundary.isTimestampRevealed(6000), true);
  });

  it('should filter revealed timestamps accurately when replay is active', () => {
    const boundary = new ReplayVisibilityBoundaryManager();
    boundary.setReplayState(true, 3000);

    assert.equal(boundary.isActive(), true);
    assert.equal(boundary.getCurrentTimestamp(), 3000);

    assert.equal(boundary.isTimestampRevealed(1000), true);
    assert.equal(boundary.isTimestampRevealed(2000), true);
    assert.equal(boundary.isTimestampRevealed(3000), true);
    assert.equal(boundary.isTimestampRevealed(3001), false);
    assert.equal(boundary.isTimestampRevealed(4000), false);
  });

  it('should calculate revealed index range correctly', () => {
    const boundary = new ReplayVisibilityBoundaryManager();
    boundary.setReplayState(true, 3000);

    const range = boundary.getRevealedIndexRange(mockData);
    assert.deepEqual(range, { start: 0, end: 2 });
  });

  it('should return full index range when replay is inactive', () => {
    const boundary = new ReplayVisibilityBoundaryManager();
    const range = boundary.getRevealedIndexRange(mockData);
    assert.deepEqual(range, { start: 0, end: 4 });
  });

  it('should return revealed data list correctly', () => {
    const boundary = new ReplayVisibilityBoundaryManager();
    boundary.setReplayState(true, 3000);

    const revealed = boundary.getRevealedDataList(mockData);
    assert.equal(revealed.length, 3);
    assert.deepEqual(
      revealed.map((d) => d.timestamp),
      [1000, 2000, 3000]
    );
  });

  it('should get effective last candle correctly', () => {
    const boundary = new ReplayVisibilityBoundaryManager();
    boundary.setReplayState(true, 3000);
    assert.deepEqual(boundary.getEffectiveLastCandle(mockData), { timestamp: 3000, close: 30 });

    boundary.setReplayState(true, 5000);
    assert.deepEqual(boundary.getEffectiveLastCandle(mockData), { timestamp: 5000, close: 50 });

    boundary.reset();
    assert.deepEqual(boundary.getEffectiveLastCandle(mockData), { timestamp: 5000, close: 50 });
  });

  it('should clamp point to revealed boundary correctly when replay is active', () => {
    const boundary = new ReplayVisibilityBoundaryManager();
    boundary.setReplayState(true, 3000);

    const futurePoint = { timestamp: 4000, value: 1.25, dataIndex: 3 };
    const clamped = boundary.clampPointToRevealedBoundary(futurePoint, mockData);

    assert.equal(clamped.timestamp, 3000);
    assert.equal(clamped.dataIndex, 2);
    assert.equal(clamped.value, 1.25);

    const validPoint = { timestamp: 2000, value: 1.25, dataIndex: 1 };
    const untouched = boundary.clampPointToRevealedBoundary(validPoint, mockData);
    assert.deepEqual(untouched, validPoint);
  });

  it('should not clamp point when replay is inactive', () => {
    const boundary = new ReplayVisibilityBoundaryManager();
    const futurePoint = { timestamp: 4000, value: 1.25, dataIndex: 3 };
    const untouched = boundary.clampPointToRevealedBoundary(futurePoint, mockData);

    assert.deepEqual(untouched, futurePoint);
  });

  it('should calculate leftMinVisibleBarCount correctly during replay and default when inactive', () => {
    const boundary = new ReplayVisibilityBoundaryManager();
    // Inactive: should return default 2
    assert.equal(boundary.getLeftMinVisibleBarCount(mockData), 2);

    // Active at timestamp 3000 (K = 2 out of 5, so N = 5, K = 2, H = 5 - 1 - 2 = 2)
    // leftMinVisibleBarCount = H + 1 = 3
    boundary.setReplayState(true, 3000);
    assert.equal(boundary.getLeftMinVisibleBarCount(mockData), 3);

    // Active at timestamp 5000 (K = 4 out of 5, latest candle, H = 0)
    // leftMinVisibleBarCount = H + 1 = 1
    boundary.setReplayState(true, 5000);
    assert.equal(boundary.getLeftMinVisibleBarCount(mockData), 1);

    // Active at timestamp 1000 (K = 0 out of 5, first candle, H = 4)
    // leftMinVisibleBarCount = H + 1 = 5
    boundary.setReplayState(true, 1000);
    assert.equal(boundary.getLeftMinVisibleBarCount(mockData), 5);

    // Reset: returns default 2
    boundary.reset();
    assert.equal(boundary.getLeftMinVisibleBarCount(mockData), 2);
  });
});

