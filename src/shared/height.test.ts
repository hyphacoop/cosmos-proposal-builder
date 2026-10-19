import { describe, expect, it } from 'vitest';
import { average, estimateHeight, parseBlockTime, sampleCount, sampleHeights, validateSampling } from './height.js';

describe('sampleHeights', () => {
  it('matches Python range(start, end, step)', () => {
    expect(sampleHeights(1000, 100, 30)).toEqual([900, 930, 960, 990]);
    expect(sampleCount(100, 30)).toBe(4);
    expect(sampleHeights(5000, 1000, 50)).toHaveLength(sampleCount(1000, 50));
  });
});

describe('validateSampling', () => {
  it('accepts the defaults', () => {
    expect(validateSampling(1000, 50)).toEqual({});
  });

  it('flags out-of-range and non-integer settings per field', () => {
    expect(validateSampling(50, 0)).toEqual({ lookBack: expect.any(String), step: expect.any(String) });
    expect(validateSampling(Number.NaN, 1.5)).toEqual({ lookBack: expect.any(String), step: expect.any(String) });
  });

  it('caps the number of samples', () => {
    expect(validateSampling(10000, 1).samples).toContain('the limit is 200');
  });
});

describe('parseBlockTime', () => {
  it('keeps sub-millisecond precision', () => {
    const a = parseBlockTime('2026-10-16T12:00:00.123456789Z');
    const b = parseBlockTime('2026-10-16T12:00:05.623456789Z');
    expect(b - a).toBeCloseTo(5.5, 6);
  });

  it('accepts timestamps without a fraction', () => {
    expect(parseBlockTime('1970-01-01T00:00:10Z')).toBe(10);
  });

  it('rejects garbage', () => {
    expect(() => parseBlockTime('yesterday')).toThrow();
  });
});

describe('average', () => {
  it('averages and rejects empty input', () => {
    expect(average([5, 6, 7])).toBe(6);
    expect(() => average([])).toThrow();
  });
});

describe('estimateHeight', () => {
  const now = new Date('2026-10-16T00:00:00Z');

  it('rounds up to the next 100', () => {
    // 86400 s / 6 s = 14400 blocks; 1_000_050 + 14_400 = 1_014_450 -> 1_014_500
    expect(estimateHeight(1_000_050, 6, new Date('2026-10-17T00:00:00Z'), now)).toBe(1_014_500);
  });

  it('keeps exact multiples of 100', () => {
    expect(estimateHeight(1_000_000, 6, new Date('2026-10-16T00:10:00Z'), now)).toBe(1_000_100);
  });

  it('truncates partial blocks like Python int()', () => {
    // 59 s / 6 s = 9.83 -> 9 blocks
    expect(estimateHeight(1_000_090, 6, new Date('2026-10-16T00:00:59Z'), now)).toBe(1_000_100);
  });

  it('rejects a non-positive block time', () => {
    expect(() => estimateHeight(1, 0, now, now)).toThrow();
  });
});
