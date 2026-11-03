# Repository credential review — 2026-11-03

This is a repository-content review for sharing the project. It is not a
penetration test, dependency audit or approval of the deployed service.

## Scope and methods

- Refreshed `origin` references with `git fetch`, without pushing or changing
  local branch history.
- Checked all 527 commits reachable from the available branch/tag refs.
  Gitleaks 8.30.1 processed 492 commit patches; merge commits account for
  the difference. The release archive checksum was verified before use.
- Scanned a temporary snapshot of tracked files and intended untracked source
  files, including the uncommitted auth implementation. Ignored environment
  files, generated native projects and private reports were not copied.
- Separately scanned commit messages from available refs and reflogs.
- Supplemented pattern scanning with a review of historical text blobs reachable
  through refs/reflogs for credential-bearing URLs, secret assignments, SQL
  passwords and private-key headers. Inspected candidate context without
  publishing credential values.
- Compared candidate values with the configured local secret values in memory;
  none matched. Local env contents and hashes are not part of this report.

## Results

Gitleaks found no credential matches in the available history, commit messages
or working-tree snapshots taken before and after the documentation cleanup. The supplemental review found example URL
credentials, intentional test strings, a documentation regex and an old SQL
bootstrap's low-entropy development password. These are historical fixtures
or examples, not evidence of an active service credential. The obsolete SQL
bootstrap is not the current schema/setup path and its password did not match
the configured local database credential.

No private signing key, tracked operational env file or active credential was
identified by this review. **No history rewrite is justified by these findings.**
Existing commit IDs and worktree/branch relationships were preserved; no remote
push, credential rotation or production configuration change was performed.

## Preventive changes

- Broadened env-file ignore patterns while keeping `.env.example` shareable.
- Ignored private keys, signing profiles and local operating notes.
- Kept documentation focused on the existing deployment, with generic
  configuration examples and private operating details outside shared guides.
- Documented secret handling, synthetic demo data and source/license boundaries.

Raw scan output, the scanner binary and redacted diagnostic reports remain in
ignored `tmp/security-audit/`. They are local review material, not artifacts
to publish with the project.

## Limits

The review covers the repository objects available locally after fetch and
current intended source files. It cannot establish what was previously copied
into an issue, uploaded as an artifact, stored in another clone, deleted from
the remote before fetch or kept in an external service. A new real exposure
requires rotation even if its current Git copy has already been removed.
