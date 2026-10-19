// Write Brotli and gzip copies of the built text assets, which the server sends to browsers that accept them
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root = process.argv[2] ?? 'dist/web';

for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !/\.(html|js|css|svg|json)$/.test(entry.name)) {
    continue;
  }
  const path = join(entry.parentPath, entry.name);
  const data = readFileSync(path);
  writeFileSync(`${path}.br`, brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }));
  writeFileSync(`${path}.gz`, gzipSync(data, { level: 9 }));
}
