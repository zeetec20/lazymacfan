#!/usr/bin/env bash
# Build release tarballs + sha256 checksums for lazymacfan.
# Usage: ./scripts/build-release.sh [version] [arch]
#   arch: "arm64", "x64", "universal", or empty (defaults to current host)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="${1:-$(bun -e 'console.log(require("./package.json").version)')}"
REQUESTED_ARCH="${2:-}"
DIST="$ROOT/dist"
mkdir -p "$DIST"

OS_NAME="$(uname -s)"
if [[ "$OS_NAME" != "Darwin" ]]; then
  echo "error: lazymacfan only supports macOS (Darwin), got: $OS_NAME" >&2
  exit 1
fi

HOST_ARCH="$(uname -m)"
case "$HOST_ARCH" in
  arm64|aarch64) HOST_ARCH_NAME="arm64" ;;
  x86_64)        HOST_ARCH_NAME="x64" ;;
  *) echo "error: unsupported architecture: $HOST_ARCH" >&2; exit 1 ;;
esac

TARGET_ARCH="${REQUESTED_ARCH:-$HOST_ARCH_NAME}"

build_arch() {
  local arch="$1"
  local clang_arch
  local bun_target

  case "$arch" in
    arm64)
      clang_arch="arm64"
      bun_target="bun-darwin-arm64"
      ;;
    x64)
      clang_arch="x86_64"
      bun_target="bun-darwin-x64"
      ;;
    *)
      echo "error: unknown architecture '$arch'" >&2
      exit 1
      ;;
  esac

  echo "=== Building lazymacfan v$VERSION ($arch) ==="
  local stage="$DIST/stage-$arch"
  rm -rf "$stage"
  mkdir -p "$stage"

  # 1. Compile native helper for this arch
  echo "  -> Compiling lazymacfan-helper ($clang_arch)..."
  clang -O3 -arch "$clang_arch" -framework IOKit -framework CoreFoundation \
    src/native/lazymacfan-helper.c -o "$stage/lazymacfan-helper"

  # 2. Compile standalone CLI/TUI binary
  echo "  -> Compiling lazymacfan ($bun_target)..."
  bun build src/cli/index.ts --compile --target="$bun_target" --outfile="$stage/lazymacfan"

  # 3. Create release tarball containing both binaries
  local tarball="$DIST/lazymacfan-darwin-${arch}.tar.gz"
  local shafile="$DIST/lazymacfan-darwin-${arch}.sha256"

  echo "  -> Packaging $tarball..."
  tar -czf "$tarball" -C "$stage" lazymacfan lazymacfan-helper

  # 4. Generate SHA256 checksum
  if command -v shasum &>/dev/null; then
    shasum -a 256 "$tarball" | awk '{print $1}' > "$shafile"
  else
    sha256sum "$tarball" | awk '{print $1}' > "$shafile"
  fi

  rm -rf "$stage"
  echo "  ✅ Created $tarball (SHA: $(cat "$shafile"))"
}

if [[ "$TARGET_ARCH" == "all" || "$TARGET_ARCH" == "universal" ]]; then
  build_arch "arm64"
  build_arch "x64"
else
  build_arch "$TARGET_ARCH"
fi

echo "Build complete."
