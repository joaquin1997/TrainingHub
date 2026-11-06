import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it.skipIf(process.platform !== 'darwin')('retries initial workout mirroring without duplicate or stale sessions', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'traininghub-mirroring-'));
  const root = path.dirname(fileURLToPath(import.meta.url));
  const executable = path.join(directory, 'checks');
  try {
    execFileSync('xcrun', ['swiftc', '-parse-as-library',
      path.join(root, '../../targets/watch/WorkoutMirroringRecovery.swift'),
      path.join(root, 'tests/mirroring-recovery.swift'), '-o', executable], { timeout: 30_000 });
    expect(execFileSync(executable, { encoding: 'utf8', timeout: 10_000 })).toContain('Mirroring recovery checks passed');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 45_000);
