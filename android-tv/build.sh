#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
: "${SDK:?Android SDK required}"
BT="$SDK/build-tools/35.0.0"
PLATFORM="$SDK/platforms/android-35/android.jar"
test -f "$PLATFORM"
mkdir -p build/classes build/dex build/gen
"$BT/aapt2" compile --dir res -o build/resources.zip
"$BT/aapt2" link -I "$PLATFORM" --manifest AndroidManifest.xml --java build/gen -o build/unsigned.apk build/resources.zip
javac -encoding UTF-8 --release 8 -classpath "$PLATFORM" -d build/classes $(find src build/gen -name '*.java')
jar cf build/classes.jar -C build/classes .
"$BT/d8" --lib "$PLATFORM" --min-api 23 --output build/dex build/classes.jar
(cd build/dex && zip -q ../unsigned.apk classes*.dex)
"$BT/zipalign" -p -f 4 build/unsigned.apk build/aligned.apk
if [[ ! -f build/cinema-tv.keystore ]]; then
 keytool -genkeypair -keystore build/cinema-tv.keystore -storepass android -keypass android -alias cinema-tv -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Cinema TV, O=Cinema, C=KW" >/dev/null
fi
"$BT/apksigner" sign --ks build/cinema-tv.keystore --ks-key-alias cinema-tv --ks-pass pass:android --key-pass pass:android --out build/Cinema-TV.apk build/aligned.apk
"$BT/apksigner" verify --verbose build/Cinema-TV.apk
"$BT/aapt2" dump badging build/Cinema-TV.apk | sed -n '1,20p'
