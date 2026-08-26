/**
 * Calculates 5 discrete speed steps (in seconds per bar) based on the configured maximum and minimum bar durations.
 *
 * @param maxDur Slowest speed boundary (seconds per bar, default: 3.0)
 * @param minDur Fastest speed boundary (seconds per bar, default: 0.1)
 * @returns An array of 5 numeric speed step values from max (Slowest) down to min (Fastest).
 */
export function calculateSpeedSteps(maxDur: number = 3.0, minDur: number = 0.1): number[] {
  const max = Math.max(0.01, maxDur ?? 3.0);
  const min = Math.min(max, Math.max(0.01, minDur ?? 0.1));

  // If default limits (3.0s to 0.1s), return exact historical steps
  if (Math.abs(max - 3.0) < 0.001 && Math.abs(min - 0.1) < 0.001) {
    return [3, 2, 1, 0.5, 0.1];
  }

  const ratio = Math.pow(min / max, 1 / 4);
  const rawSteps = [
    max,
    max * ratio,
    max * Math.pow(ratio, 2),
    max * Math.pow(ratio, 3),
    min,
  ];

  return rawSteps.map((val) => Number(val.toFixed(val < 0.1 ? 3 : 2)));
}

/**
 * Finds the index of the speed step closest to the current speed.
 */
export function getClosestStepIndex(steps: number[], currentSpeed: number): number {
  if (!steps || steps.length === 0) return 0;
  let closestIdx = 0;
  let minDiff = Infinity;
  steps.forEach((step, idx) => {
    const diff = Math.abs(step - currentSpeed);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = idx;
    }
  });
  return closestIdx;
}
