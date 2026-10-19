import type { StepProps } from '../draft.js';
import { Section } from './ui.js';

const OPTIONS = [
  {
    expedited: true,
    label: 'Expedited',
    description:
      'Shorter voting period and a higher passing threshold, and it needs the larger expedited minimum deposit. ' +
      "If it doesn't pass in time, it continues as a standard proposal.",
  },
  {
    expedited: false,
    label: 'Standard',
    description: 'The regular voting period and passing threshold.',
  },
];

export function ExpediteStep({ draft, update }: StepProps) {
  return (
    <Section title="Expedite" description="Choose whether the proposal goes to an expedited vote.">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Voting</legend>
        {OPTIONS.map((option) => {
          const checked = draft.expedited === option.expedited;
          return (
            <label
              key={option.label}
              className={
                'flex cursor-pointer gap-3 border p-4 has-focus-visible:ring-2 has-focus-visible:ring-accent ' +
                (checked ? 'border-accent bg-wash' : 'border-line bg-surface hover:bg-wash')
              }
            >
              <input
                type="radio"
                name="expedited"
                checked={checked}
                onChange={() => update({ expedited: option.expedited })}
                className="mt-0.5 size-4 shrink-0 accent-brand outline-none"
              />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-ink">{option.label}</span>
                <span className="text-sm text-muted">{option.description}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
    </Section>
  );
}
