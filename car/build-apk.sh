#!/usr/bin/env bash
# Run this from the project root to build the Android APK
set -e

echo "==> Navigating to Expo app..."
cd "$(dirname "$0")/artifacts/car"

echo "==> Current directory: $(pwd)"
echo "==> Checking eas.json..."

if [ ! -f "eas.json" ]; then
  echo "ERROR: eas.json not found. Running eas build:configure..."
  eas build:configure
fi

echo "==> Starting EAS build..."
eas build --platform android --profile preview
