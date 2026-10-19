import { describe, expect, it } from 'vitest';
import { buildProposal, formatProposal, GOV_AUTHORITY } from './proposal.js';

const inputs = {
  version: 'v29.0.0',
  markdown: '## Background\n\nThe Hub\'s next upgrade.\n',
  height: '50',
  info: '{"binaries":{"linux/amd64":"https://example.com/gaiad?checksum=sha256:bbb"}}',
  deposit: '50100000',
  denom: 'uatom',
  expedited: true,
};

describe('buildProposal', () => {
  it('builds a software upgrade proposal from the inputs', () => {
    expect(buildProposal(inputs)).toEqual({
      messages: [
        {
          '@type': '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade',
          authority: GOV_AUTHORITY,
          plan: {
            name: 'v29.0.0',
            time: '0001-01-01T00:00:00Z',
            height: '50',
            info: inputs.info,
            upgraded_client_state: null,
          },
        },
      ],
      metadata: 'ipfs://CID',
      deposit: '50100000uatom',
      title: 'Gaia v29.0.0 Upgrade',
      summary: '## Background\r\n\r\nThe Hub\'s next upgrade.\r\n',
      expedited: true,
    });
  });

  it('sets the expedited flag from the inputs', () => {
    expect(buildProposal({ ...inputs, expedited: false }).expedited).toBe(false);
  });
});

describe('formatProposal', () => {
  it('indents with four spaces and round-trips', () => {
    const output = formatProposal(inputs);
    expect(output).toMatch(/^\{\n {4}"messages": \[/);
    expect(JSON.parse(output)).toEqual(buildProposal(inputs));
  });
});
