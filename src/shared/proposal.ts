export const GOV_AUTHORITY = 'cosmos10d07y265gmmuvt4z0w9aw880jnsr700j6zn9kn';

export interface ProposalInputs {
  version: string;
  markdown: string;
  height: string;
  info: string;
  deposit: string;
  denom: string;
  expedited: boolean;
}

export function buildProposal({ version, markdown, height, info, deposit, denom, expedited }: ProposalInputs) {
  return {
    messages: [
      {
        '@type': '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade',
        authority: GOV_AUTHORITY,
        plan: {
          name: version,
          time: '0001-01-01T00:00:00Z',
          height,
          info,
          upgraded_client_state: null,
        },
      },
    ],
    metadata: 'ipfs://CID',
    deposit: deposit + denom,
    title: `Gaia ${version} Upgrade`,
    summary: markdown.replaceAll('\n', '\r\n'),
    expedited,
  };
}

export function formatProposal(inputs: ProposalInputs): string {
  return JSON.stringify(buildProposal(inputs), null, 4);
}
