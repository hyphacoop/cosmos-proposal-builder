import { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { StepProps } from '../draft.js';
import { Field, Input, Section, Textarea } from './ui.js';

const REMARK_PLUGINS = [remarkGfm];

// Memoized so edits elsewhere in the form don't re-parse the Markdown
const Preview = memo(function Preview({ markdown }: { markdown: string }) {
  return (
    <article
      className={
        'prose prose-sm max-w-none overflow-auto border border-line bg-surface p-4 ' +
        'prose-headings:font-heading prose-a:hover:no-underline prose-pre:rounded-none ' +
        'max-h-[32rem] lg:h-[40rem] lg:max-h-none'
      }
    >
      <Markdown remarkPlugins={REMARK_PLUGINS}>{markdown}</Markdown>
    </article>
  );
});

export function ProposalTextStep({ draft, update, errors }: StepProps) {
  return (
    <Section title="Proposal text" description="Name the upgrade and write the proposal summary in Markdown.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Upgrade name"
          htmlFor="upgrade-name"
          hint="Used as the plan name and in the title."
          error={errors.upgradeName}
        >
          <Input
            id="upgrade-name"
            value={draft.upgradeName}
            onChange={(e) => update({ upgradeName: e.target.value })}
            aria-invalid={Boolean(errors.upgradeName)}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field
          label="Release tag"
          htmlFor="release-tag"
          hint="The cosmos/gaia GitHub release to take binaries from."
          error={errors.releaseTag}
        >
          <Input
            id="release-tag"
            value={draft.releaseTag}
            onChange={(e) => update({ releaseTag: e.target.value })}
            aria-invalid={Boolean(errors.releaseTag)}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Proposal Markdown" htmlFor="proposal-md">
          <Textarea
            id="proposal-md"
            value={draft.markdown}
            onChange={(e) => update({ markdown: e.target.value })}
            className="min-h-80 font-mono text-sm leading-relaxed lg:h-[40rem]"
          />
        </Field>
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="text-sm font-semibold text-ink">Preview</h3>
          <Preview markdown={draft.markdown} />
        </div>
      </div>
    </Section>
  );
}
