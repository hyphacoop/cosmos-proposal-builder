import { useState } from 'react';
import { fetchUpgradeInfo } from '../../shared/github.js';
import { formatProposal } from '../../shared/proposal.js';
import { toProposalInputs, type Draft, type DraftErrors } from '../draft.js';
import { Button, ErrorMessage, Section } from './ui.js';

// Fields that go into the proposal, with where to fix them
const PROPOSAL_FIELDS: Partial<Record<keyof DraftErrors, string>> = {
  upgradeName: 'Upgrade name (Proposal text)',
  releaseTag: 'Release tag (Proposal text)',
  upgradeHeight: 'Upgrade height (Upgrade height)',
  deposit: 'Initial deposit (Deposit)',
  denom: 'Denom (Deposit)',
};

export function JsonStep({ draft, errors }: { draft: Draft; errors: DraftErrors }) {
  const [busy, setBusy] = useState(false);
  // The only input that needs a request; everything else comes straight from the draft
  const [release, setRelease] = useState<{ tag: string; info: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const tag = draft.releaseTag.trim();
  const issues = Object.entries(PROPOSAL_FIELDS).flatMap(([field, label]) => {
    const message = errors[field as keyof DraftErrors];
    return message ? [`${label}: ${message}`] : [];
  });
  const info = release?.tag === tag ? release.info : null;
  const json = info && issues.length === 0 ? formatProposal(toProposalInputs(draft, info)) : null;

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      setRelease({ tag, info: await fetchUpgradeInfo(tag) });
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(json!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy; select the text and copy it manually');
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([json!], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'proposal.json' });
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Section
      title="Proposal JSON"
      description="Fetches the release's binaries and checksums from GitHub and assembles the proposal for gaiad tx gov submit-proposal. Once generated, it updates as you edit the form."
    >
      {issues.length > 0 && (
        // A chunky violet left border marks notices, as the design system does for emphasis
        <ul className="list-inside list-disc border-l-4 border-accent bg-wash p-4 text-sm text-ink">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {!info && (
          <Button onClick={generate} busy={busy} disabled={issues.length > 0}>
            {busy ? 'Generating…' : 'Generate JSON'}
          </Button>
        )}
        {json && (
          <>
            <Button variant="secondary" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="secondary" onClick={download}>
              Download proposal.json
            </Button>
          </>
        )}
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {json && (
        <pre
          aria-label="Proposal JSON"
          tabIndex={0}
          className="max-h-[70vh] overflow-auto border border-line bg-sunken p-4 font-mono text-xs leading-relaxed text-ink"
        >
          {json}
        </pre>
      )}
    </Section>
  );
}
