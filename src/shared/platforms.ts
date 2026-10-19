export const TARGET_PLATFORMS = ['darwin-amd64', 'linux-amd64'] as const;
export type Platform = (typeof TARGET_PLATFORMS)[number];

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  // "sha256:<hex>", computed by GitHub on upload; missing on assets uploaded before mid-2025
  digest?: string | null;
}

// Match binaries named '<...>-darwin-amd64', but not companions like '.asc' signatures
export function findPlatform(name: string): Platform | null {
  return TARGET_PLATFORMS.find((platform) => name.endsWith(`-${platform}`)) ?? null;
}

// Build the upgrade plan's info field from a release's assets and their GitHub digests
export function buildUpgradeInfo(assets: ReleaseAsset[]): string {
  const binaries = new Map<Platform, { url: string; checksum?: string }>();
  for (const asset of assets) {
    const platform = findPlatform(asset.name);
    if (platform) {
      const checksum = asset.digest?.startsWith('sha256:') ? asset.digest.slice('sha256:'.length) : undefined;
      binaries.set(platform, { url: asset.browser_download_url, checksum });
    }
  }

  const missingBinaries = TARGET_PLATFORMS.filter((p) => !binaries.has(p));
  if (missingBinaries.length > 0) {
    throw new Error(`The release has no binary for: ${missingBinaries.join(', ')}`);
  }
  const missingChecksums = TARGET_PLATFORMS.filter((p) => !binaries.get(p)!.checksum);
  if (missingChecksums.length > 0) {
    throw new Error(
      `GitHub has no checksum for: ${missingChecksums.join(', ')}. ` +
        'Release files uploaded before mid-2025 lack one.',
    );
  }

  const info: Record<string, string> = {};
  for (const [platform, { url, checksum }] of binaries) {
    info[platform.replace('-', '/')] = `${url}?checksum=sha256:${checksum}`;
  }
  return JSON.stringify({ binaries: info });
}
