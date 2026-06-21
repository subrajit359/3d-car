#!/usr/bin/env bash
# Android APK build script for the 3D Car Game
set -e

# ---- Environment setup ----
JAVA_BIN=$(readlink -f "$(which java)" 2>/dev/null || echo "")
export JAVA_HOME="${JAVA_BIN%/bin/java}"
export ANDROID_HOME="/home/runner/workspace/.android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0:$JAVA_HOME/bin:$PATH"

echo "JAVA_HOME=$JAVA_HOME"
echo "ANDROID_HOME=$ANDROID_HOME"
java -version

# ---- Expo prebuild (generates android/ folder) ----
cd "$(dirname "$0")"  # artifacts/car/
echo ""
echo "==> Running expo prebuild..."
npx expo prebuild --platform android --clean --no-install 2>&1

# ---- Gradle build (debug APK) ----
echo ""
echo "==> Building debug APK with Gradle..."
cd android/
chmod +x gradlew
./gradlew assembleDebug --no-daemon 2>&1

echo ""
echo "==> APK ready:"
find . -name "*.apk" -not -path "*/intermediates/*" 2>/dev/null
