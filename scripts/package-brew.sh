#!/usr/bin/env bash
set -euo pipefail

VERSION="0.1.0"
TAR_NAME="lazymacfan-v${VERSION}-universal.tar.gz"

echo "=== Building universal binaries ==="
bun run build

echo "=== Creating release tarball ==="
mkdir -p release
tar -czf "release/${TAR_NAME}" -C . dist/lazymacfan dist/lazymacfan-helper

echo "=== Calculating SHA256 Checksum ==="
SHA256=$(shasum -a 256 "release/${TAR_NAME}" | awk '{print $1}')
echo "SHA256: ${SHA256}"

# Update Formula
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/sha256 \".*\"/sha256 \"${SHA256}\"/" Formula/lazymacfan.rb
else
  sed -i "s/sha256 \".*\"/sha256 \"${SHA256}\"/" Formula/lazymacfan.rb
fi

echo "✅ Formula/lazymacfan.rb updated with sha256: ${SHA256}"
echo "Release tarball created at: release/${TAR_NAME}"
