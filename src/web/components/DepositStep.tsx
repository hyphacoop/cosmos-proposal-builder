import { isWholeNumber, type StepProps } from '../draft.js';
import { Field, Input, Section } from './ui.js';

// Show micro-denominations like uatom in whole tokens
function wholeTokens(deposit: string, denom: string): string | null {
  if (!isWholeNumber(deposit) || !/^u[a-z]+$/.test(denom)) {
    return null;
  }
  const amount = Number(deposit) / 1_000_000;
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${denom.slice(1).toUpperCase()}`;
}

export function DepositStep({ draft, update, errors }: StepProps) {
  const tokens = wholeTokens(draft.deposit, draft.denom);
  return (
    <Section title="Deposit" description="The initial deposit submitted with the proposal.">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field
          label="Initial deposit"
          htmlFor="deposit"
          error={errors.deposit}
          hint={tokens}
        >
          <Input
            id="deposit"
            inputMode="numeric"
            value={draft.deposit}
            onChange={(e) => update({ deposit: e.target.value })}
            aria-invalid={Boolean(errors.deposit)}
            className="font-mono"
          />
        </Field>
        <Field label="Denom" htmlFor="denom" error={errors.denom}>
          <Input
            id="denom"
            value={draft.denom}
            onChange={(e) => update({ denom: e.target.value })}
            aria-invalid={Boolean(errors.denom)}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
        </Field>
      </div>
    </Section>
  );
}
