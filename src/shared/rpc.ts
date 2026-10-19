import { average, parseBlockTime, sampleHeights, validateSampling } from './height.js';
import { fetchWithTimeout } from './http.js';

const CONCURRENCY = 5;

interface BlockHeader {
  height: string;
  time: string;
}

// Parse a user-entered RPC endpoint, dropping any trailing slash so paths can be appended
export function normalizeRpcUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('Enter a full URL, like https://rpc.example.com');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('The RPC endpoint must be an http or https URL');
  }
  return url.origin + url.pathname.replace(/\/+$/, '');
}

// Call a CometBFT RPC method and return its result
async function rpcResult<T>(rpc: string, path: string): Promise<T> {
  const response = await fetchWithTimeout(
    rpc + path,
    {},
    `Could not reach ${new URL(rpc).host}. Check the URL, and that the endpoint allows browser requests (CORS).`,
  );
  const body = (await response.json().catch(() => null)) as {
    result?: T;
    error?: { data?: string; message?: string };
  } | null;
  if (!response.ok || !body?.result) {
    const detail = body?.error?.data ?? body?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`RPC request ${path} failed: ${detail}`);
  }
  return body.result;
}

// Seconds between block `height - 1` and `height`. /blockchain returns just the two headers in one request.
async function blockInterval(rpc: string, height: number): Promise<number> {
  const { block_metas } = await rpcResult<{ block_metas: { header: BlockHeader }[] }>(
    rpc,
    `/blockchain?minHeight=${height - 1}&maxHeight=${height}`,
  );
  const timeAt = (h: number) => {
    const header = block_metas.find((meta) => meta.header.height === String(h))?.header;
    if (!header) {
      throw new Error(`The RPC did not return block ${h}`);
    }
    return parseBlockTime(header.time);
  };
  return timeAt(height) - timeAt(height - 1);
}

// Run tasks with at most `limit` in flight, keeping results in order
async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Returns the current height and the average block time in seconds, sampled over the last lookBack blocks
export async function fetchAverageBlockTime(rpc: string, lookBack: number, step: number) {
  const problem = Object.values(validateSampling(lookBack, step))[0];
  if (problem) {
    throw new Error(problem);
  }
  const status = await rpcResult<{ sync_info: { latest_block_height: string } }>(rpc, '/status');
  const currentHeight = Number(status.sync_info.latest_block_height);
  const intervals = await mapLimit(sampleHeights(currentHeight, lookBack, step), CONCURRENCY, (height) =>
    blockInterval(rpc, height),
  );
  return { currentHeight, averageBlockTime: average(intervals) };
}
