/**
 * Calculates discrete speed steps (in seconds per bar) based on the configured maximum and minimum bar durations.
 *
 * @param maxDur Slowest speed boundary (seconds per bar, default: 3.0)
 * @param minDur Fastest speed boundary (seconds per bar, default: 0.1)
 * @param stepCount Number of discrete selectable speed positions (default: 10)
 * @returns An array of numeric speed step values from max (Slowest) down to min (Fastest).
 */
export function calculateSpeedSteps(
  maxDur: number = 3.0,
  minDur: number = 0.01,
  stepCount: number = 10
): number[] {
  const max = Math.max(0.01, maxDur ?? 3.0);
  const min = Math.min(max, Math.max(0.01, minDur ?? 0.01));
  const count = Math.max(2, stepCount ?? 10);

  if (Math.abs(max - min) < 0.0001) {
    return Array(count).fill(Number(max.toFixed(max < 0.1 ? 3 : 2)));
  }

  const ratio = Math.pow(min / max, 1 / (count - 1));
  const steps: number[] = [];

  for (let i = 0; i < count; i++) {
    const rawVal = i === 0 ? max : i === count - 1 ? min : max * Math.pow(ratio, i);
    const precision = rawVal < 0.1 ? 3 : 2;
    steps.push(Number(rawVal.toFixed(precision)));
  }

  // Ensure each click position has a distinct, strictly descending speed value
  for (let i = 1; i < steps.length; i++) {
    if (steps[i] >= steps[i - 1]) {
      const rawVal = max * Math.pow(ratio, i);
      steps[i] = Number(rawVal.toFixed(4));
    }
  }

  return steps;
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
