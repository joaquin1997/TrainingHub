# Security and repository sharing

TrainingHub is a personal application in development. A private-network
deployment and a green test suite are not a public-production security review.
Current auth rollout and distribution work are tracked in the spec backlog.

## Credentials and local files

- Keep database passwords, signing secrets, provider secrets, tokens, backups,
  photos and signing material outside tracked files.
- `.env` and `.env.*` files are ignored except `.env.example`. Examples must
  contain placeholders only; use a random local signing secret.
- Private keys, signing profiles and `docs/local/` operating notes are ignored.
  Do not force-add them to Git.
- `EXPO_PUBLIC_*`, OAuth client IDs, bundle IDs and Apple team IDs are public
  configuration; none is a place to store a secret.
- Inject production secrets at runtime, not in a Docker layer, command transcript
  or README. Do not print an operational env file during troubleshooting.
- Local development permits a deliberately public fallback signing key when
  no secret is set. Never use that fallback or development mode for an exposed
  deployment; configure a real secret. Production refuses a blank secret.

## Demonstrations and external review

Use synthetic account names and invented training history in shared examples. Do not share a production dump, actual profile photos, health data,
credentials or other people's personal information. Check the permissions for
third-party assets separately from ownership of the application code.

Review access does not itself grant an open-source license. The repository
currently has no application-code license grant; source notes are in
[docs/data-sources.md](docs/data-sources.md).

## Scan before sharing

With [Gitleaks](https://github.com/gitleaks/gitleaks) installed, refresh the
remote refs and scan all locally available branches, not just the tip:

```bash
git fetch origin
gitleaks git --redact=100 --log-opts="--all --full-history"
```

Scan a snapshot containing tracked files and intended new files for uncommitted
changes. Avoid scanning or publishing an entire local workspace: it contains
ignored env files, generated projects, caches and private reports. Keep scanner
reports under ignored `tmp/`; preserve redaction when investigating matches.

The [2026-11-03 review](docs/security-review-2026-11-03.md) records what was
checked and its limits. A scanner's zero findings is not proof that every
possible credential or historical disclosure has been ruled out.

## If a real credential is found

Revoke or rotate it at the issuing service first. Remove it from current files,
then assess a coordinated history rewrite across affected branches/tags.
Rewriting local Git does not revoke a credential or remove copies in forks,
clones, logs, caches, review systems or transcripts. Do not force-push or
publish sensitive findings as part of routine cleanup.

Report suspected exposures privately to the repository owner. Keep actual
secret values out of public issues and screenshots.
