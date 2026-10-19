import { describe, expect, it } from 'vitest';
import { fetchUpgradeInfo } from './github.js';
import { json, mockFetch } from './test-utils.js';

const fetchMock = mockFetch();

describe('fetchUpgradeInfo', () => {
  it('builds the info field from the release in a single request', async () => {
    fetchMock.mockResolvedValue(
      json({
        assets: [
          { name: 'gaiad-v28.3.1-darwin-amd64', browser_download_url: 'https://example.com/darwin', digest: 'sha256:aaa' },
          { name: 'gaiad-v28.3.1-linux-amd64', browser_download_url: 'https://example.com/linux', digest: 'sha256:bbb' },
        ],
      }),
    );
    expect(await fetchUpgradeInfo('v28.3.1')).toBe(
      '{"binaries":{"darwin/amd64":"https://example.com/darwin?checksum=sha256:aaa",' +
        '"linux/amd64":"https://example.com/linux?checksum=sha256:bbb"}}',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.github.com/repos/cosmos/gaia/releases/tags/v28.3.1');
  });

  it('reports a missing release', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Not Found' }, 404));
    await expect(fetchUpgradeInfo('v0.0.0')).rejects.toThrow('Could not find release v0.0.0');
  });

  it('explains when the rate limit is reached', async () => {
    fetchMock.mockResolvedValue(json({}, 403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' }));
    await expect(fetchUpgradeInfo('v28.3.1')).rejects.toThrow(/limit of 60 requests per hour .* Try again after/);
  });

  it('rejects tags that could change the request path without calling GitHub', async () => {
    await expect(fetchUpgradeInfo('../../foo')).rejects.toThrow('invalid characters');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchUpgradeInfo('v28.3.1')).rejects.toThrow('Could not reach GitHub');
  });
});
