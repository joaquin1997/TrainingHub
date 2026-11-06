import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
it.skipIf(process.platform !== 'darwin')('keeps native skip pending/suppression across acknowledgement and restart', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'traininghub-skip-'));
  const root = path.dirname(fileURLToPath(import.meta.url));
  const executable = path.join(dir, 'checks');
  try {
    execFileSync('xcrun', ['swiftc', '-parse-as-library', path.join(root, '../../targets/watch/WatchRestSkipState.swift'), path.join(root, 'tests/rest-skip.swift'), '-o', executable], { timeout: 30_000 });
    expect(execFileSync(executable, { encoding: 'utf8', timeout: 10_000 })).toContain('Rest skip checks passed');
  } finally { rmSync(dir, { recursive: true, force: true }); }
}, 45_000);
