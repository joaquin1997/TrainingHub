# Sourced by deploy-pending.sh and renew-iphone.sh.

# Paired physical devices of a CoreDevice deviceType (iPhone, appleWatch) that
# are within reach, one "udid<TAB>name" line each. Devices paired with this Mac
# but away (another person's phone) show tunnelState "unavailable"; simulators
# are listed as paired iPhones too.
reachable_devices() {
  local devices_json
  devices_json="$(mktemp)"
  xcrun devicectl list devices --json-output "$devices_json" >/dev/null
  node -e '
    const devices = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).result.devices;
    for (const d of devices) {
      if (d.hardwareProperties?.deviceType === process.argv[2]
        && d.hardwareProperties?.reality === "physical"
        && d.connectionProperties?.pairingState === "paired"
        && d.connectionProperties?.tunnelState !== "unavailable") {
        console.log(`${d.hardwareProperties.udid}\t${d.deviceProperties?.name ?? d.hardwareProperties.udid}`);
      }
    }
  ' "$devices_json" "$1"
  rm -f "$devices_json"
}

# "udid<TAB>name" lines for the UDIDs in $2 (space-separated, an override such
# as IOS_DEVICE_ID), or every reachable device of type $1 when $2 is empty.
target_devices() {
  local udid
  if [ -z "$2" ]; then
    reachable_devices "$1"
    return
  fi
  for udid in $2; do printf '%s\t%s\n' "$udid" "$udid"; done
}
