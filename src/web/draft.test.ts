import { describe, expect, it } from 'vitest';
import { formatUtcInput, parseUtcInput, toProposalInputs, validateDraft, type Draft } from './draft.js';

const draft: Draft = {
  upgradeName: 'v29.0.0',
  releaseTag: 'v29.0.0',
  markdown: '## Summary\n',
  rpc: 'https://rpc.example.com',
  targetTime: '2026-10-17T12:00',
  lookBack: '1000',
  step: '50',
  upgradeHeight: '50',
  deposit: '50100000',
  denom: 'uatom',
  expedited: false,
};

describe('UTC inputs', () => {
  it('round-trips a datetime-local value as UTC', () => {
    const date = parseUtcInput('2026-10-17T12:00');
    expect(date?.toISOString()).toBe('2026-10-17T12:00:00.000Z');
    expect(formatUtcInput(date!)).toBe('2026-10-17T12:00');
    expect(parseUtcInput('')).toBeNull();
  });
});

describe('validateDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateDraft(draft)).toEqual({});
  });

  it('reports each invalid field', () => {
    const errors = validateDraft({
      ...draft,
      upgradeName: ' ',
      releaseTag: '',
      rpc: 'rpc.example.com',
      targetTime: '',
      lookBack: '1e5',
      step: 'x',
      upgradeHeight: '1.5',
      deposit: '-1',
      denom: '',
    });
    expect(Object.keys(errors).sort()).toEqual(
      ['denom', 'deposit', 'lookBack', 'releaseTag', 'rpc', 'step', 'targetTime', 'upgradeHeight', 'upgradeName'].sort(),
    );
  });

  it('caps the number of samples', () => {
    expect(validateDraft({ ...draft, lookBack: '10000', step: '1' }).samples).toContain('the limit is 200');
  });
});

describe('toProposalInputs', () => {
  it('maps draft fields onto the proposal', () => {
    expect(toProposalInputs(draft, '{}')).toEqual({
      version: 'v29.0.0',
      markdown: '## Summary\n',
      height: '50',
      info: '{}',
      deposit: '50100000',
      denom: 'uatom',
      expedited: false,
    });
  });
});
