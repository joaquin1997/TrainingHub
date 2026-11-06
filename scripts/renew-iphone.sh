#!/usr/bin/env bash
#
# Daily re-sign and reinstall of the iPhone and Apple Watch apps, so the free
# team's 7-day profiles never run out. Run by the launchd agent
# ~/Library/LaunchAgents/com.joaquin.traininghub.renew-iphone.plist at 05:00.
#
#   ./scripts/renew-iphone.sh
#
# Builds what is checked out, in Release (the JS bundle goes inside the app, so
# it runs without Metro), from the existing apps/mobile/ios — no pull, no
# prebuild: run deploy-pending.sh for that. It installs on every paired iPhone
# CoreDevice can reach (cable or same Wi-Fi; FortiClient disconnected); a phone
# that is away is skipped. The watch app is embedded in the iPhone app (an ios/
# prebuilt with TRAININGHUB_WATCH_APP=1) and installed straight onto each paired
# watch CoreDevice sees; otherwise it is left to the iPhone's Watch app.
#
# Overrides (env vars):
#   IOS_DEVICE_ID="<udid> …"   iPhones to install on (default: every one within reach)
#   WATCH_DEVICE_ID="<udid> …" watches to install on (default: every one within reach)
#   RENEW_HOURS=48             drop cached profiles that expire within this many
#                              hours, so Xcode fetches new ones instead of reusing them
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

# shellcheck source=lib/devices.sh
. "$ROOT/scripts/lib/devices.sh"
# One "udid<TAB>name" line per device: every reachable iPhone and watch, so the
# app is renewed on each person's phone that is around.
IPHONES="$(target_devices iPhone "${IOS_DEVICE_ID:-}")"
[ -n "$IPHONES" ] || fail "no paired iPhone within reach"
WATCHES="$(target_devices appleWatch "${WATCH_DEVICE_ID:-}")"

# Generic destination: the iPhones are already in the team's profile, and
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

# One device failing does not stop the others; the notification lists them.
INSTALLED=""
FAILED=""
while IFS=$'\t' read -r udid name <&3; do
  step "iPhone: install on $name ($udid)"
  # Over Wi-Fi the CoreDevice tunnel is often stale ("Connection reset by peer");
  # restarting its daemons brings it back.
  if ! xcrun devicectl device install app --device "$udid" "$APP_PATH"; then
    echo "    install failed; restarting CoreDevice and retrying"
    killall CoreDeviceService remotepairingd >/dev/null 2>&1 || true
    sleep 10
    if ! xcrun devicectl device install app --device "$udid" "$APP_PATH"; then
      echo "    could not install on $name"
      FAILED="$FAILED, $name"
      continue
    fi
  fi
  INSTALLED="$INSTALLED, $name"

  step "iPhone: launch on $name"
  xcrun devicectl device process launch --device "$udid" --terminate-existing "$BUNDLE_ID" >/dev/null \
    && echo "    app launched" \
    || echo "    could not launch the app (iPhone locked, or a new profile to trust: Settings → General → VPN & Device Management); it is installed"
done 3<<< "$IPHONES"

# Straight onto the watch often fails (IXRemoteErrorDomain 6); the iPhone's
# Watch app can still install the copy embedded in the app just installed.
if [ ! -d "$WATCH_APP_PATH" ]; then
  echo "    no watch app in the build (ios/ prebuilt without TRAININGHUB_WATCH_APP=1)"
elif [ -z "$WATCHES" ]; then
  echo "    no paired Apple Watch within reach; install it from the iPhone's Watch app (My Watch → TrainingHub → Install)"
else
  while IFS=$'\t' read -r udid name <&3; do
    step "Apple Watch: install on $name ($udid)"
    if xcrun devicectl device install app --device "$udid" "$WATCH_APP_PATH"; then
      INSTALLED="$INSTALLED, $name"
    else
      echo "    could not install on $name; use the iPhone's Watch app (My Watch → TrainingHub → Install)"
      FAILED="$FAILED, $name (use the Watch app)"
    fi
  done 3<<< "$WATCHES"
fi

SUMMARY="Installed on ${INSTALLED#, }; profile until $EXPIRES"
[ -z "$INSTALLED" ] && SUMMARY="Installed nowhere"
[ -n "$FAILED" ] && SUMMARY="$SUMMARY. Failed: ${FAILED#, }"
notify "$SUMMARY"
step "done — $SUMMARY — log: $LOG"
# Not a failing test: that would fire the ERR trap and a second notification.
if [ -z "$INSTALLED" ] || [ -n "$FAILED" ]; then exit 1; fi
