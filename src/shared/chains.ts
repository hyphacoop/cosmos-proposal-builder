export interface Chain {
  id: string;
  name: string;
  rpc: string;
}

export const CHAINS: Chain[] = [
  { id: 'hub-testnet', name: 'Hub Testnet', rpc: 'https://rpc.provider-sentry-01.hub-testnet.polypore.xyz' },
  { id: 'cosmoshub', name: 'Cosmos Hub', rpc: 'https://rpc.sentry-01.cosmoshub-4.polypore.xyz' },
];

export function findChain(id: string): Chain | undefined {
  return CHAINS.find((chain) => chain.id === id);
}
