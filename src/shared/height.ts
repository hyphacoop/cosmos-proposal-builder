export const LOOK_BACK = { min: 100, max: 10000, step: 10, default: 1000 } as const;
export const SKIP = { min: 1, max: 1000, step: 1, default: 50 } as const;
// Each sample is one RPC request, so this caps an estimate at 201 requests
export const MAX_SAMPLES = 200;

export interface SamplingErrors {
  lookBack?: string;
  step?: string;
  samples?: string;
}

// Check the sampling settings before any RPC request is made
export function validateSampling(lookBack: number, step: number): SamplingErrors {
  const inRange = (value: number, { min, max }: { min: number; max: number }) =>
    Number.isInteger(value) && value >= min && value <= max;
  const errors: SamplingErrors = {};
  if (!inRange(lookBack, LOOK_BACK)) {
    errors.lookBack = `Enter a whole number from ${LOOK_BACK.min} to ${LOOK_BACK.max}`;
  }
  if (!inRange(step, SKIP)) {
    errors.step = `Enter a whole number from ${SKIP.min} to ${SKIP.max}`;
  }
  if (!errors.lookBack && !errors.step && sampleCount(lookBack, step) > MAX_SAMPLES) {
    errors.samples =
      `That's ${sampleCount(lookBack, step)} samples; the limit is ${MAX_SAMPLES}. ` +
      'Look back fewer blocks or sample less often.';
  }
  return errors;
}

// Heights sampled between lookBack blocks ago and the current block, like range(start, end, step)
export function sampleHeights(currentHeight: number, lookBack: number, step: number): number[] {
  const heights = [];
  for (let height = currentHeight - lookBack; height < currentHeight; height += step) {
    heights.push(height);
  }
  return heights;
}

export function sampleCount(lookBack: number, step: number): number {
  return Math.ceil(lookBack / step);
}

// Parse an RFC 3339 block timestamp, keeping sub-millisecond precision, into seconds
export function parseBlockTime(timestamp: string): number {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(timestamp);
  if (!match) {
    throw new Error(`Unexpected block time: ${timestamp}`);
  }
  const [, wholeSeconds, fraction = '0', zone] = match;
  return Date.parse(wholeSeconds + zone) / 1000 + Number(`0.${fraction}`);
}

export function average(values: number[]): number {
  if (values.length === 0) {
    throw new Error('No block times to average');
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Estimate the block height at targetTime, rounded up to the next 100
export function estimateHeight(currentHeight: number, averageBlockTime: number, targetTime: Date, now: Date): number {
  if (!(averageBlockTime > 0)) {
    throw new Error('Average block time must be positive');
  }
  const secondsToTarget = (targetTime.getTime() - now.getTime()) / 1000;
  const blocks = Math.trunc(secondsToTarget / averageBlockTime);
  return Math.floor((currentHeight + blocks + 99) / 100) * 100;
}
