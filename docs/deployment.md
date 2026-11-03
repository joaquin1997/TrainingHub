# Deployment

The API image and mobile Release build can be deployed independently. This
guide uses generic configuration; machine addresses and private operational
notes belong in ignored `docs/local/`.

## API container

Build from the repository root. The image uses Node 22, installs the API and
its domain dependency, generates Prisma and compiles TypeScript. Startup runs
committed migrations before listening on port 3000.

```bash
docker build -t traininghub-api:local .
```

Inject `DATABASE_URL` and `JWT_SECRET` at runtime through your deployment's
secret/env mechanism. The database URL must be reachable **from the container**;
container loopback is not the host database unless host networking is used.
Keep the signing secret stable so restarts do not invalidate sessions.

The existing `docker-compose.yml` is a Linux host-network deployment template.
It expects a database already reachable from that host. Review runtime env values and networking for the existing deployment
before running it.

```bash
docker compose -f docker-compose.yml up -d --build
```

Expose the API through an appropriate HTTPS endpoint; keep the database
private. A private-network deployment is an existing usage pattern, not a
complete public-production configuration. Abuse protection, recovery,
observability and public distribution remain [roadmap work](roadmap/09-production-readiness.md).

## Existing data and authentication rollout

The current checkout implements 0001's strict auth, but the previously deployed
API may still use the transitional anonymous path. Roll out in this order:

1. Back up the database and verify recovery access.
2. Review the legacy-user reassignment dry run with the explicit real owner.
   Apply and verify its training data before deploying the strict boundary.
3. Confirm a nonblank signing secret and apply/deploy the API.
4. Ship the matching app bundle. Old non-expiring credentials need one new login.
5. Verify anonymous health, rejected anonymous data calls, authenticated data,
   offline startup and same-user workout recovery after reauthentication.

The detailed script and acceptance checklist are in [0001](sdd/specs/0001-auth-session-hardening/plan.md).
A fresh database does not have legacy data to move. Do not infer that local
implementation or green unit tests mean the server rollout already happened.

The catalog report/apply workflow can retire and merge existing exercise rows.
It is an explicit data operation with a backup and review, not a schema
migration to run automatically on every deployment.

## Native device builds

Follow the [mobile guide](../apps/mobile/README.md) to generate the native
project with the desired Watch/widget flags. From `apps/mobile`, build using
your own device and team:

```bash
xcodebuild -workspace ios/TrainingHub.xcworkspace -scheme TrainingHub \
  -configuration Release -destination 'generic/platform=iOS' \
  -derivedDataPath ios/DerivedData -allowProvisioningUpdates build

xcrun devicectl device install app --device <device-id> \
  ios/DerivedData/Build/Products/Release-iphoneos/TrainingHub.app
```

Set `EXPO_PUBLIC_API_URL` to your HTTPS API address in the build environment
before bundling. Public client IDs used for Google also belong in the app's
build configuration; Google verification uses the matching server allowlist.
Client secrets never belong in an Expo public variable.

A Debug development build loads JS from Metro. Release includes the JS bundle;
shipping a JS change to a standalone phone still needs a new bundle/build.
Apple free-team profiles can expire and capability availability differs by
team; verify provisioning with your own account instead of relying on the
maintainer's cached native project.

## Maintainer automation

`scripts/run.sh`, `scripts/deploy-pending.sh` and `scripts/renew-iphone.sh`
contain operational defaults for the maintainer's environment. They are not
the local quick start. Inspect their overrides before running them; some
steps replace deployed containers, rebuild native projects or install apps.
An automatic re-sign/build is not evidence that every device acceptance
criterion passed.

## Verification and recovery

- `/health` reports service and database availability without user data.
- Authenticated smoke checks should exercise the real deployed version.
- Keep database backups and data-operation reports private and outside Git.
- Rollback an API image or app bundle explicitly. Data ownership/carry-over
  operations need their backup/report; they are not automatically reversed
  by checking out older code.

Local Docker image builds and signed native/device builds are separate from
CI's typecheck and unit/route tests.
