#!/usr/bin/env bash
# Install the latest lazymacfan binary for macOS (arm64 or x86_64).
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/zeetec20/lazymacfan/main/scripts/install.sh | bash
# Override install directory:
#   INSTALL_DIR=$HOME/.local/bin bash <(curl -fsSL https://raw.githubusercontent.com/zeetec20/lazymacfan/main/scripts/install.sh)
set -euo pipefail

REPO="zeetec20/lazymacfan"
DEFAULT_INSTALL_DIR="/usr/local/bin"
INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_INSTALL_DIR}"

OS="$(uname -s)"
if [[ "$OS" != "Darwin" ]]; then
  echo "error: lazymacfan is designed exclusively for macOS, got: $OS" >&2
  exit 1
fi

ARCH="$(uname -m)"
case "$ARCH" in
  arm64|aarch64) ARCH_NAME="arm64" ;;
  x86_64)        ARCH_NAME="x64" ;;
  *) echo "error: unsupported architecture: $ARCH (only arm64 and x86_64 are supported)" >&2; exit 1 ;;
esac

echo "==> Fetching latest release information for ${REPO}..."
VERSION="${VERSION:-}"
if [[ -z "$VERSION" ]]; then
  VERSION="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null \
    | grep '"tag_name"' | head -n1 | sed -E 's/.*"v?([^"]+)".*/\1/' || true)"
fi

if [[ -z "$VERSION" ]]; then
  # Fallback to package.json version if release tag query fails
  VERSION="$(curl -fsSL "https://raw.githubusercontent.com/${REPO}/main/package.json" 2>/dev/null \
    | grep '"version"' | head -n1 | sed -E 's/.*"version": "([^"]+)".*/\1/' || echo "0.1.0")"
fi

TARBALL="lazymacfan-darwin-${ARCH_NAME}.tar.gz"
SHAFILE="lazymacfan-darwin-${ARCH_NAME}.sha256"
BASE="https://github.com/${REPO}/releases/download/v${VERSION}"

echo "==> Installing lazymacfan v${VERSION} (macOS-${ARCH_NAME})..."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "==> Downloading ${TARBALL}..."
if ! curl -fsSL "${BASE}/${TARBALL}" -o "$TMP/${TARBALL}" 2>/dev/null; then
  echo "error: failed to download release asset from ${BASE}/${TARBALL}" >&2
  echo "You can build directly from source: git clone https://github.com/${REPO} && cd lazymacfan && bun install && bun run build" >&2
  exit 1
fi

if curl -fsSL "${BASE}/${SHAFILE}" -o "$TMP/${SHAFILE}" 2>/dev/null; then
  EXPECTED="$(awk '{print $1}' "$TMP/${SHAFILE}")"
  ACTUAL="$(shasum -a 256 "$TMP/${TARBALL}" | awk '{print $1}')"
  if [[ -n "$EXPECTED" && "$EXPECTED" != "$ACTUAL" ]]; then
    echo "error: checksum mismatch! Expected: $EXPECTED, got: $ACTUAL" >&2
    exit 1
  fi
  echo "==> Checksum verified: $ACTUAL"
fi

echo "==> Extracting files..."
tar -xzf "$TMP/${TARBALL}" -C "$TMP"

# Ensure target directory exists
if [[ ! -d "$INSTALL_DIR" ]]; then
  if [[ -w "$(dirname "$INSTALL_DIR")" ]]; then
    mkdir -p "$INSTALL_DIR"
  else
    sudo mkdir -p "$INSTALL_DIR"
  fi
fi

# Copy binaries
if [[ -w "$INSTALL_DIR" ]]; then
  cp "$TMP/lazymacfan" "$INSTALL_DIR/lazymacfan"
  chmod +x "$INSTALL_DIR/lazymacfan"
  if [[ -f "$TMP/lazymacfan-helper" ]]; then
    cp "$TMP/lazymacfan-helper" "$INSTALL_DIR/lazymacfan-helper"
    chmod +x "$INSTALL_DIR/lazymacfan-helper"
  fi
else
  echo "==> Installing to $INSTALL_DIR (requires admin password)..."
  sudo cp "$TMP/lazymacfan" "$INSTALL_DIR/lazymacfan"
  sudo chmod +x "$INSTALL_DIR/lazymacfan"
  if [[ -f "$TMP/lazymacfan-helper" ]]; then
    sudo cp "$TMP/lazymacfan-helper" "$INSTALL_DIR/lazymacfan-helper"
    sudo chmod +x "$INSTALL_DIR/lazymacfan-helper"
  fi
fi

echo "✅ Installed lazymacfan to $INSTALL_DIR/lazymacfan"

# Warn if INSTALL_DIR is not in PATH
if ! echo ":$PATH:" | grep -q ":${INSTALL_DIR}:"; then
  echo "  Note: add $INSTALL_DIR to your PATH to use 'lazymacfan' directly."
  echo "  e.g.: export PATH=\"${INSTALL_DIR}:\$PATH\""
fi

echo ""
echo "🎉 Installation complete! Launch lazymacfan by typing:"
echo "   lazymacfan"
echo ""
