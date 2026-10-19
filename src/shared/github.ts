import { fetchWithTimeout } from './http.js';
import { buildUpgradeInfo, type ReleaseAsset } from './platforms.js';

const RELEASES_URL = 'https://api.github.com/repos/cosmos/gaia/releases/tags/';
const TAG_PATTERN = /^[\w.+-]{1,64}$/;

function rateLimitMessage(response: Response): string {
  const reset = Number(response.headers.get('x-ratelimit-reset'));
  const when = reset ? ` after ${new Date(reset * 1000).toLocaleTimeString(undefined, { timeStyle: 'short' })}` : ' later';
  return `GitHub's limit of 60 requests per hour for your network has been reached. Try again${when}.`;
}

// Look up a cosmos/gaia release and build the upgrade plan's info field from its binaries
export async function fetchUpgradeInfo(tag: string): Promise<string> {
  if (!TAG_PATTERN.test(tag)) {
    throw new Error('The release tag contains invalid characters');
  }
  const response = await fetchWithTimeout(
    RELEASES_URL + encodeURIComponent(tag),
    { headers: { accept: 'application/vnd.github+json' } },
    'Could not reach GitHub',
  );
  if (response.status === 404) {
    throw new Error(`Could not find release ${tag}`);
  }
  if ((response.status === 403 || response.status === 429) && response.headers.get('x-ratelimit-remaining') === '0') {
    throw new Error(rateLimitMessage(response));
  }
  if (!response.ok) {
    throw new Error(`GitHub returned HTTP ${response.status} for release ${tag}`);
  }
  const { assets } = (await response.json()) as { assets: ReleaseAsset[] };
  return buildUpgradeInfo(assets);
}
