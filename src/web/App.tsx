import type { ReactNode } from 'react';
import { DepositStep } from './components/DepositStep.js';
import { ExpediteStep } from './components/ExpediteStep.js';
import { HeightStep } from './components/HeightStep.js';
import { JsonStep } from './components/JsonStep.js';
import { ProposalTextStep } from './components/ProposalTextStep.js';
import { useDraft } from './draft.js';

// One numbered section of the page, separated from the previous one by a rule
function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 border-t border-line pt-8 sm:gap-5 sm:pt-10">
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center bg-brand font-heading text-sm font-bold text-white"
      >
        {number}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

export function App() {
  const { draft, update, errors } = useDraft();
  const props = { draft, update, errors };

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-4 pt-6 pb-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="font-heading text-3xl leading-none font-extrabold text-accent">Cosmos Proposal Builder</h1>
        <p className="mt-2 text-sm text-muted">
          Build a Cosmos SDK software upgrade proposal.
        </p>
      </header>

      <ol aria-label="Proposal steps" className="flex flex-col gap-8 sm:gap-10">
        <Step number={1}>
          <ProposalTextStep {...props} />
        </Step>
        <Step number={2}>
          <HeightStep {...props} />
        </Step>
        <Step number={3}>
          <ExpediteStep {...props} />
        </Step>
        <Step number={4}>
          <DepositStep {...props} />
        </Step>
        <Step number={5}>
          <JsonStep draft={draft} errors={errors} />
        </Step>
      </ol>
    </div>
  );
}
