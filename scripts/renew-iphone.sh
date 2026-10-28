#!/usr/bin/env bash
#
# Daily re-sign and reinstall of the iPhone and Apple Watch apps, so the free
# team's 7-day profiles never run out. Run by the launchd agent
# ~/Library/LaunchAgents/com.joaquin.traininghub.renew-iphone.plist at 09:00.
#
#   ./scripts/renew-iphone.sh
#
# Builds what is checked out, in Release (the JS bundle goes inside the app, so
# it runs without Metro), from the existing apps/mobile/ios — no pull, no
# prebuild: run deploy-pending.sh for that. The iPhone must be reachable by
# CoreDevice (cable or same Wi-Fi; FortiClient disconnected). The watch app is
# embedded in the iPhone app (an ios/ prebuilt with TRAININGHUB_WATCH_APP=1) and
# installed straight onto the paired watch when CoreDevice sees it; otherwise it
# is left to the iPhone's Watch app.
#
# Overrides (env vars):
#   IOS_DEVICE_ID=<udid>   iPhone to install on (default: the paired iPhone)
#   WATCH_DEVICE_ID=<udid> watch to install on (default: the paired Apple Watch)
#   RENEW_HOURS=48         drop cached profiles that expire within this many hours,
#                          so Xcode fetches new ones instead of reusing them
#
# Logged to tmp/renew-iphone-<timestamp>.log; a notification tells how it went.
#
set -euo pipefail

# launchd starts with a bare PATH; the bundling build phase needs Node 22.13+.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://joaquinserver.tail644a1a.ts.net:8443}"
BUNDLE_ID="com.joaquin.traininghub"
PROFILES_DIR="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
LOG_DIR="$ROOT/tmp"
LOG="$LOG_DIR/renew-iphone-$(date +%Y%m%d-%H%M%S).log"
APP_PATH="$ROOT/apps/mobile/ios/DerivedData/Build/Products/Release-iphoneos/TrainingHub.app"
WATCH_APP_PATH="$APP_PATH/Watch/TrainingHubWatch.app"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG") 2>&1

notify() { osascript -e "display notification \"$1\" with title \"TrainingHub\"" >/dev/null 2>&1 || true; }
step() { echo; echo "==> [$(date +%H:%M:%S)] $*"; }
fail() { echo "!! $*" >&2; notify "Renewal failed: $*"; exit 1; }
trap 'notify "Renewal failed at line $LINENO, see tmp/$(basename "$LOG")"' ERR

caffeinate -dims -w $$ &

# A deploy-pending.sh run rebuilds ios/ under our feet.
other="$(cat "$LOG_DIR/deploy-pending.lock/pid" 2>/dev/null || true)"
if [ -n "$other" ] && kill -0 "$other" 2>/dev/null; then
  echo "deploy-pending.sh is running (pid $other); skipping today's renewal"
  exit 0
fi

cd "$ROOT/apps/mobile"
[ -d ios/TrainingHub.xcworkspace ] || fail "no apps/mobile/ios: run scripts/deploy-pending.sh once"

profile_expiry() { security cms -D -i "$1" 2>/dev/null | plutil -extract ExpirationDate raw - 2>/dev/null; }

step "profiles: drop the ones expiring within ${RENEW_HOURS:-48}h"
limit=$(( $(date +%s) + ${RENEW_HOURS:-48} * 3600 ))
for profile in "$PROFILES_DIR"/*.mobileprovision; do
  [ -f "$profile" ] || continue
  app_id="$(security cms -D -i "$profile" 2>/dev/null \
    | plutil -extract Entitlements.application-identifier raw - 2>/dev/null || true)"
  case "$app_id" in *".$BUNDLE_ID"*) ;; *) continue ;; esac
  expiry="$(profile_expiry "$profile")"
  if [ "$(date -j -u -f %Y-%m-%dT%H:%M:%SZ "$expiry" +%s)" -lt "$limit" ]; then
    echo "    $app_id expires $expiry: removed"
    rm -f "$profile"
  else
    echo "    $app_id expires $expiry: kept"
  fi
done

# UDID of the first paired physical device of a CoreDevice deviceType.
paired_device() {
  local devices_json
  devices_json="$(mktemp)"
  xcrun devicectl list devices --json-output "$devices_json" >/dev/null
  node -e '
    const devices = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).result.devices;
    const device = devices.find((d) => d.hardwareProperties?.deviceType === process.argv[2]
      && d.hardwareProperties?.reality === "physical"
      && d.connectionProperties?.pairingState === "paired");
    process.stdout.write(device?.hardwareProperties?.udid ?? "");
  ' "$devices_json" "$1"
  rm -f "$devices_json"
}

DEVICE_ID="${IOS_DEVICE_ID:-$(paired_device iPhone)}"
[ -n "$DEVICE_ID" ] || fail "no paired iPhone found"
WATCH_ID="${WATCH_DEVICE_ID:-$(paired_device appleWatch)}"

# Generic destination: the iPhone is already in the team's profile, and
# `-destination id=` hangs while CoreDevice is still connecting.
step "iPhone: xcodebuild Release at $(git -C "$ROOT" rev-parse --short HEAD) (slow)"
xcodebuild -quiet -workspace ios/TrainingHub.xcworkspace -scheme TrainingHub \
  -configuration Release -destination 'generic/platform=iOS' -derivedDataPath ios/DerivedData \
  -allowProvisioningUpdates build

EXPIRES="$(profile_expiry "$APP_PATH/embedded.mobileprovision")"
echo "    signed with a profile that expires $EXPIRES"
WATCH_EXPIRES=""
if [ -d "$WATCH_APP_PATH" ]; then
  WATCH_EXPIRES="$(profile_expiry "$WATCH_APP_PATH/embedded.mobileprovision")"
  echo "    watch app signed with a profile that expires $WATCH_EXPIRES"
fi

step "iPhone: install on $DEVICE_ID"
# Over Wi-Fi the CoreDevice tunnel is often stale ("Connection reset by peer");
# restarting its daemons brings it back.
if ! xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"; then
  echo "    install failed; restarting CoreDevice and retrying"
  killall CoreDeviceService remotepairingd >/dev/null 2>&1 || true
  sleep 10
  xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"
fi

step "iPhone: launch"
xcrun devicectl device process launch --device "$DEVICE_ID" --terminate-existing "$BUNDLE_ID" >/dev/null \
  && echo "    app launched" \
  || echo "    could not launch the app (iPhone locked, or a new profile to trust: Settings → General → VPN & Device Management); it is installed"

# Straight onto the watch often fails (IXRemoteErrorDomain 6); the iPhone's
# Watch app can still install the copy embedded in the app just installed.
WATCH_RESULT=""
if [ ! -d "$WATCH_APP_PATH" ]; then
  echo "    no watch app in the build (ios/ prebuilt without TRAININGHUB_WATCH_APP=1)"
elif [ -z "$WATCH_ID" ]; then
  echo "    no paired Apple Watch found; install it from the iPhone's Watch app (My Watch → TrainingHub → Install)"
  WATCH_RESULT="; watch: install it from the Watch app"
else
  step "Apple Watch: install on $WATCH_ID"
  if xcrun devicectl device install app --device "$WATCH_ID" "$WATCH_APP_PATH"; then
    WATCH_RESULT=" and the watch; watch profile until $WATCH_EXPIRES"
  else
    echo "    could not install on the watch; use the iPhone's Watch app (My Watch → TrainingHub → Install)"
    WATCH_RESULT="; watch failed, install it from the Watch app"
  fi
fi

notify "Installed on the iPhone$WATCH_RESULT; iPhone profile until $EXPIRES"
step "done — log: $LOG"
