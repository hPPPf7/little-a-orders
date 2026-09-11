#!/usr/bin/env bash
set -euo pipefail
mkdir -p diagnostics
adb install old.apk
adb shell am start -n tw.littlea.orders/.MainActivity
for i in $(seq 1 12); do
  sleep 5
  adb shell uiautomator dump /sdcard/update.xml >/dev/null
  adb pull /sdcard/update.xml diagnostics/update.xml >/dev/null
  if grep -q '有新版本可更新' diagnostics/update.xml; then
    echo 'Published v1.0.0 detected and downloaded the real newer release.'
    adb exec-out screencap -p > diagnostics/update.png
    exit 0
  fi
done
adb logcat -d > diagnostics/logcat.txt
adb exec-out screencap -p > diagnostics/update.png
echo 'No update prompt from the published old APK within 60 seconds.'
exit 1
