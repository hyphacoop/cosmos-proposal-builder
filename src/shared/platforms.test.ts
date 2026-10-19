import { describe, expect, it } from 'vitest';
import { buildUpgradeInfo, findPlatform } from './platforms.js';

describe('findPlatform', () => {
  it.each([
    ['gaiad-v29.0.0-darwin-amd64', 'darwin-amd64'],
    ['gaiad-v29.0.0-linux-amd64', 'linux-amd64'],
    ['gaiad-v29.0.0-linux-amd64.asc', null],
    ['gaiad-v29.0.0-linux-arm64', null],
    ['gaiad-v29.0.0-darwin-amd64.tar.gz', null],
    ['SHA256SUMS-v29.0.0.txt', null],
  ])('%s -> %s', (name, platform) => {
    expect(findPlatform(name)).toBe(platform);
  });
});

describe('buildUpgradeInfo', () => {
  const asset = (name: string, digest?: string | null) => ({
    name,
    browser_download_url: `https://example.com/${name}`,
    digest,
  });
  const assets = [
    asset('SHA256SUMS-v29.0.0.txt', 'sha256:fff'),
    asset('gaiad-v29.0.0-linux-amd64', 'sha256:bbb'),
    asset('gaiad-v29.0.0-linux-amd64.asc', 'sha256:ccc'),
    asset('gaiad-v29.0.0-darwin-amd64', 'sha256:aaa'),
  ];

  it('maps each platform to its binary URL with the GitHub digest appended', () => {
    expect(buildUpgradeInfo(assets)).toBe(
      '{"binaries":{"linux/amd64":"https://example.com/gaiad-v29.0.0-linux-amd64?checksum=sha256:bbb",' +
        '"darwin/amd64":"https://example.com/gaiad-v29.0.0-darwin-amd64?checksum=sha256:aaa"}}',
    );
  });

  it('fails when a binary is missing', () => {
    expect(() => buildUpgradeInfo(assets.slice(0, 3))).toThrow('The release has no binary for: darwin-amd64');
  });

  it('fails when GitHub has no digest, as for releases uploaded before mid-2025', () => {
    expect(() =>
      buildUpgradeInfo([asset('gaiad-v22.0.0-linux-amd64', null), asset('gaiad-v22.0.0-darwin-amd64')]),
    ).toThrow('GitHub has no checksum for: darwin-amd64, linux-amd64.');
  });
});
