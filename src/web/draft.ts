import { useCallback, useMemo, useState } from 'react';
import { CHAINS } from '../shared/chains.js';
import { LOOK_BACK, SKIP, validateSampling } from '../shared/height.js';
import type { ProposalInputs } from '../shared/proposal.js';
import { normalizeRpcUrl } from '../shared/rpc.js';

export interface Draft {
  upgradeName: string;
  releaseTag: string;
  markdown: string;
  rpc: string;
  // A datetime-local value (YYYY-MM-DDTHH:MM), interpreted as UTC
  targetTime: string;
  // Kept as typed so a half-edited number field isn't rewritten
  lookBack: string;
  step: string;
  upgradeHeight: string;
  deposit: string;
  denom: string;
  expedited: boolean;
}

export type DraftErrors = Partial<Record<keyof Draft | 'samples', string>>;
export type UpdateDraft = (changes: Partial<Draft>) => void;

export interface StepProps {
  draft: Draft;
  update: UpdateDraft;
  errors: DraftErrors;
}

// Starting point for the proposal summary; blank lines keep the bold notice out of the list
const PROPOSAL_TEMPLATE = `## Summary

* Bumps ...

## Release Details

* The release can be found [here](URL).
* The changelog can be found [here](URL).

**This upgrade is state-breaking and mandatory once the on-chain vote passes and the upgrade height is reached.**
`;

// datetime-local inputs hold YYYY-MM-DDTHH:MM with no zone; this form treats them as UTC
export const formatUtcInput = (date: Date) => date.toISOString().slice(0, 16);

export function parseUtcInput(value: string): Date | null {
  // Check the shape first: Date parsing is lenient, and reads an empty value as 2000-01-01
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    return null;
  }
  const date = new Date(`${value.slice(0, 16)}:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const isWholeNumber = (value: string) => /^\d+$/.test(value.trim());

function defaultDraft(): Draft {
  return {
    upgradeName: 'v29.0.0',
    releaseTag: 'v29.0.0-rc0',
    markdown: PROPOSAL_TEMPLATE,
    rpc: CHAINS[0].rpc,
    targetTime: formatUtcInput(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    lookBack: String(LOOK_BACK.default),
    step: String(SKIP.default),
    upgradeHeight: '50',
    deposit: '50100000',
    denom: 'uatom',
    expedited: true,
  };
}

// Every validation rule for the form, keyed by field
export function validateDraft(draft: Draft): DraftErrors {
  const errors: DraftErrors = validateSampling(Number(draft.lookBack), Number(draft.step));
  if (!draft.upgradeName.trim()) errors.upgradeName = 'Enter an upgrade name';
  if (!draft.releaseTag.trim()) errors.releaseTag = 'Enter a release tag';
  try {
    normalizeRpcUrl(draft.rpc);
  } catch (error) {
    errors.rpc = (error as Error).message;
  }
  if (!parseUtcInput(draft.targetTime)) errors.targetTime = 'Pick a date and time';
  if (!isWholeNumber(draft.upgradeHeight)) errors.upgradeHeight = 'Enter a whole number';
  if (!isWholeNumber(draft.deposit)) errors.deposit = 'Enter a whole number';
  if (!draft.denom.trim()) errors.denom = 'Enter a denom';
  return errors;
}

export function toProposalInputs(draft: Draft, info: string): ProposalInputs {
  return {
    version: draft.upgradeName,
    markdown: draft.markdown,
    height: draft.upgradeHeight,
    info,
    deposit: draft.deposit,
    denom: draft.denom,
    expedited: draft.expedited,
  };
}

// Form state for the whole proposal. It lives only in memory: reloading the page starts over.
export function useDraft() {
  const [draft, setDraft] = useState(defaultDraft);
  const update = useCallback<UpdateDraft>((changes) => setDraft((current) => ({ ...current, ...changes })), []);
  const errors = useMemo(() => validateDraft(draft), [draft]);
  return { draft, update, errors };
}
