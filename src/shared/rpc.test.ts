import { describe, expect, it } from 'vitest';
import { fetchAverageBlockTime, normalizeRpcUrl } from './rpc.js';
import { json, mockFetch } from './test-utils.js';

const fetchMock = mockFetch();

// A chain at height 1,000,000 producing one block every 6 seconds
function mockRpc() {
  const header = (height: number) => ({
    height: String(height),
    time: new Date(Date.UTC(2026, 0, 1) + height * 6000).toISOString(),
  });
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input));
    if (url.pathname === '/status') {
      return json({ result: { sync_info: { latest_block_height: '1000000' } } });
    }
    // /blockchain lists headers newest first
    const max = Number(url.searchParams.get('maxHeight'));
    return json({ result: { block_metas: [{ header: header(max) }, { header: header(max - 1) }] } });
  });
}

describe('normalizeRpcUrl', () => {
  it('trims whitespace and trailing slashes, keeping any path', () => {
    expect(normalizeRpcUrl(' https://RPC.example.com/ ')).toBe('https://rpc.example.com');
    expect(normalizeRpcUrl('https://example.com/cosmos/rpc/')).toBe('https://example.com/cosmos/rpc');
    expect(normalizeRpcUrl('http://localhost:26657')).toBe('http://localhost:26657');
  });

  it.each(['', 'rpc.example.com', 'ftp://rpc.example.com', 'javascript:alert(1)'])('rejects %j', (input) => {
    expect(() => normalizeRpcUrl(input)).toThrow();
  });
});

describe('fetchAverageBlockTime', () => {
  it('averages block intervals with one request per sample', async () => {
    mockRpc();
    const { currentHeight, averageBlockTime } = await fetchAverageBlockTime('https://rpc.example.com', 1000, 50);
    expect(currentHeight).toBe(1_000_000);
    expect(averageBlockTime).toBeCloseTo(6);
    // /status plus one /blockchain request per sample
    expect(fetchMock).toHaveBeenCalledTimes(1 + 20);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://rpc.example.com/status');
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://rpc.example.com/blockchain?minHeight=998999&maxHeight=999000');
  });

  it('refuses invalid sampling settings without calling the RPC', async () => {
    await expect(fetchAverageBlockTime('https://rpc.example.com', 10000, 1)).rejects.toThrow('the limit is 200');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports the error the RPC returns', async () => {
    fetchMock.mockResolvedValue(json({ error: { data: 'height 1 is not available' } }, 500));
    await expect(fetchAverageBlockTime('https://rpc.example.com', 1000, 50)).rejects.toThrow(
      'height 1 is not available',
    );
  });

  it('explains network and CORS failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchAverageBlockTime('https://rpc.example.com', 1000, 50)).rejects.toThrow(
      'Could not reach rpc.example.com. Check the URL, and that the endpoint allows browser requests (CORS).',
    );
  });
});
