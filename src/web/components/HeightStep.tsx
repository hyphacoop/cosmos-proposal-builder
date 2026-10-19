import { useState } from 'react';
import { CHAINS, findChain } from '../../shared/chains.js';
import { estimateHeight, LOOK_BACK, sampleCount, SKIP } from '../../shared/height.js';
import { fetchAverageBlockTime, normalizeRpcUrl } from '../../shared/rpc.js';
import { parseUtcInput, type StepProps } from '../draft.js';
import { Button, ErrorMessage, Field, Input, Section, Select } from './ui.js';

const CUSTOM = 'custom';

// Show the viewer's local time alongside the UTC target
const localTime = (date: Date) =>
  date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

export function HeightStep({ draft, update, errors }: StepProps) {
  const [busy, setBusy] = useState(false);
  const [estimate, setEstimate] = useState<{ currentHeight: number; averageBlockTime: number; height: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const rpcUrl = errors.rpc ? null : normalizeRpcUrl(draft.rpc);
  // The picker shows the preset whose endpoint is in the field, or Custom once it's edited
  const preset = CHAINS.find((chain) => chain.rpc === rpcUrl);
  const target = parseUtcInput(draft.targetTime);
  const samplingOk = !errors.lookBack && !errors.step;
  const canEstimate = rpcUrl && target && samplingOk && !errors.samples;

  // A result or error from a previous endpoint no longer applies
  function setRpc(rpc: string) {
    update({ rpc });
    setEstimate(null);
    setError(null);
  }

  // Queries the RPC straight from the browser, so any endpoint that allows CORS works
  async function runEstimate() {
    setBusy(true);
    setError(null);
    try {
      const { currentHeight, averageBlockTime } = await fetchAverageBlockTime(
        rpcUrl!,
        Number(draft.lookBack),
        Number(draft.step),
      );
      const height = estimateHeight(currentHeight, averageBlockTime, target!, new Date());
      setEstimate({ currentHeight, averageBlockTime, height });
      update({ upgradeHeight: String(height) });
    } catch (error) {
      setError(`Could not estimate upgrade height: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      title="Upgrade height"
      description="Estimate the block height for a target time from the chain's recent average block time, or enter it directly."
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <Field label="Chain" htmlFor="chain">
          <Select
            id="chain"
            value={preset?.id ?? CUSTOM}
            onChange={(e) => {
              const chain = findChain(e.target.value);
              if (chain) setRpc(chain.rpc);
            }}
          >
            {CHAINS.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.name}
              </option>
            ))}
            <option value={CUSTOM}>Custom</option>
          </Select>
        </Field>
        <Field
          label="RPC endpoint"
          htmlFor="rpc"
          error={errors.rpc}
          hint="Your browser queries this endpoint directly, so it must allow cross-origin (CORS) requests."
        >
          <Input
            id="rpc"
            type="url"
            inputMode="url"
            placeholder="https://rpc.example.com"
            value={draft.rpc}
            onChange={(e) => setRpc(e.target.value)}
            aria-invalid={Boolean(errors.rpc)}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field
          label="Target upgrade time (UTC)"
          htmlFor="target-time"
          hint={target ? `Your local time: ${localTime(target)}` : undefined}
          error={errors.targetTime}
        >
          <Input
            id="target-time"
            type="datetime-local"
            value={draft.targetTime}
            onChange={(e) => update({ targetTime: e.target.value })}
            aria-invalid={Boolean(errors.targetTime)}
          />
        </Field>
      </div>

      <details className="border border-line bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Sampling settings
          <span className="ml-2 font-normal text-muted">
            {samplingOk && `${sampleCount(Number(draft.lookBack), Number(draft.step))} samples over ${draft.lookBack} blocks`}
          </span>
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Blocks to look back"
            htmlFor="look-back"
            error={errors.lookBack}
          >
            <Input
              id="look-back"
              type="number"
              inputMode="numeric"
              min={LOOK_BACK.min}
              max={LOOK_BACK.max}
              step={LOOK_BACK.step}
              value={draft.lookBack}
              onChange={(e) => update({ lookBack: e.target.value })}
              aria-invalid={Boolean(errors.lookBack)}
            />
          </Field>
          <Field
            label="Blocks between samples"
            htmlFor="step"
            error={errors.step}
          >
            <Input
              id="step"
              type="number"
              inputMode="numeric"
              min={SKIP.min}
              max={SKIP.max}
              step={SKIP.step}
              value={draft.step}
              onChange={(e) => update({ step: e.target.value })}
              aria-invalid={Boolean(errors.step)}
            />
          </Field>
        </div>
        {errors.samples && <p className="mt-3 text-xs text-danger">{errors.samples}</p>}
      </details>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={runEstimate} busy={busy} disabled={!canEstimate}>
          {busy ? 'Estimating…' : 'Estimate height'}
        </Button>
        {error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          estimate && (
            <p role="status" className="text-sm text-muted">
              Estimated {estimate.height.toLocaleString()} from current height {estimate.currentHeight.toLocaleString()}{' '}
              and an average block time of {estimate.averageBlockTime.toFixed(2)} s
            </p>
          )
        )}
      </div>

      <Field
        label="Upgrade height"
        htmlFor="upgrade-height"
        error={errors.upgradeHeight}
        className="sm:max-w-xs"
      >
        <Input
          id="upgrade-height"
          inputMode="numeric"
          value={draft.upgradeHeight}
          onChange={(e) => update({ upgradeHeight: e.target.value })}
          aria-invalid={Boolean(errors.upgradeHeight)}
          className="font-mono"
        />
      </Field>
    </Section>
  );
}
