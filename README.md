# lazymacfan 🌀

> Lightweight macOS TUI application and persistent background fan controller for Apple Silicon and Intel Macs.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-black.svg)](https://bun.sh)
[![Oxc](https://img.shields.io/badge/Linter_%26_Formatter-Oxc-orange.svg)](https://oxc.rs)
[![Platform](https://img.shields.io/badge/macOS-Apple_Silicon_%26_Intel-lightgrey.svg)](https://apple.com)

---

## 📖 Overview

**lazymacfan** is designed with a fundamental architectural principle:
> **The TUI is only the interface. Fan control continues independently in the background.**

When you exit the Terminal UI, the background controller keeps running, maintaining your manual RPM or applying your custom temperature curves.

```text
                 lazymacfan
                     │
          ┌──────────┴──────────┐
          │                     │
       OpenTUI                 CLI
          │                     │
          └──────────┬──────────┘
                     │
              Unix Domain Socket
                     │
                     ▼
             Background Agent
                     │
             ┌───────┴───────┐
             │               │
        Temperature     Fan Control
          Sensors         Backend
             │               │
             └───────┬───────┘
                     ▼
           macOS SMC & IOHID
```

---

## ✨ Features

- **Decoupled Architecture**: Terminal UI and background controller communicate via Unix domain socket (`lazymacfan.sock`). Exiting the UI does not stop fan management.
- **Universal Multi-Architecture**: Supports both **Apple Silicon** (M1/M2/M3/M4/M5) and **Mac Intel** (`x86_64`) via Universal Mach-O binaries.
- **Hardware Telemetry**: Reads all available temperature sensors (CPU, GPU, battery, memory, SSD) via `IOHIDEventSystemClient` and `AppleSMC`.
- **Automatic & Manual Modes**:
  - **Manual**: Set target RPM per fan.
  - **Automatic**: Customizable linear fan curves mapped to CPU/GPU package temperatures.
- **Hard Safety Guarantees**:
  - Hardware RPM clamping to minimum/maximum supported fan speeds.
  - Emergency 95°C override: forces 100% safe fan speed if critical temperatures are exceeded.
  - Fail-safe exit: returns fan control to macOS automatic hardware management on daemon shutdown.
- **Persistent Configuration**: Saved in `~/Library/Application Support/lazymacfan/config.toml`.
- **macOS launchd Integration**: Start at login, run as daemon, restart on crashes.
- **Oxc Toolchain**: Linting with `oxlint`, formatting with `oxfmt`, and testing with `vitest`.
- **Reproducible Dev Environment**: Preconfigured with `flake.nix` and `direnv`.

---

## 🚀 Installation

### Homebrew (Recommended)

```bash
brew tap zeetec/tap
brew install lazymacfan
```

To run as a persistent background service with `launchd`:
```bash
brew services start lazymacfan
```

### From Source (Bun + Nix)

```bash
git clone https://github.com/zeetec/lazymacfan.git
cd lazymacfan

# If using direnv & Nix:
direnv allow

# Install dependencies:
bun install

# Build universal binaries:
bun run build
```

---

## 🎮 Usage

### 1. Interactive Terminal UI (OpenTUI)

```bash
lazymacfan
```

#### Keybindings
| Key | Action |
|---|---|
| `d` | Go to Dashboard |
| `f` | Go to Fans view & manual control |
| `t` | Go to Temperature Sensors view |
| `c` | Go to Fan Curve visualization |
| `s` | Go to Settings view |
| `m` | Toggle between Manual and Automatic fan mode |
| `←` / `→` | Decrease / Increase target fan speed (±100 RPM) |
| `↑` / `↓` | Navigate list items |
| `r` | Refresh hardware telemetry |
| `?` | Toggle Help modal |
| `q` | Quit UI (agent continues running in background) |

---

### 2. Command Line Interface (CLI)

```bash
# Start background controller daemon directly
lazymacfan agent

# Check controller status & telemetry
lazymacfan status

# List all detected fans
lazymacfan fans

# List all temperature sensors
lazymacfan sensors

# Set fan speed manually
lazymacfan fan 0 --rpm 3200

# Toggle mode
lazymacfan mode auto
lazymacfan mode manual

# Service management (launchd)
lazymacfan service start
lazymacfan service stop
lazymacfan service restart
lazymacfan service status

# View background logs
lazymacfan logs
lazymacfan logs --follow
```

---

## ⚙️ Configuration (`config.toml`)

Stored at `~/Library/Application Support/lazymacfan/config.toml`:

```toml
[controller]
mode = "auto"
poll_interval_ms = 1000
emergency_temp_c = 95
temp_unit = "C"

[fan.0]
target_rpm = 2500

[fan.0.automatic]
sensor = "auto"

[[fan.0.automatic.curve]]
temperature = 45
rpm = 1800

[[fan.0.automatic.curve]]
temperature = 60
rpm = 3000

[[fan.0.automatic.curve]]
temperature = 75
rpm = 4500
```

---

## 🛠️ Development & Quality Assurance

This project uses the high-performance **Oxc** toolchain alongside **Bun** and **TypeScript**:

```bash
# Lint with oxlint (Oxc Rust-based linter)
bun run lint
bun run lint:fix

# Format with oxfmt (Oxc Prettier-compatible formatter)
bun run format
bun run format:check

# Run unit and integration tests (Vitest / Bun)
bun run test
bun run test:bun

# Type check (strict TypeScript)
bun run typecheck

# Build Universal Mach-O Binaries (arm64 + x86_64)
bun run build
```

---

## 🔒 Safety & Permissions Notice

- **Telemetry (Read-Only)**: Querying fan speeds and temperature sensors requires no special permissions and works out-of-the-box for any user.
- **Fan Speed Control (Write)**: On macOS, writing to the System Management Controller (`AppleSMC`) registers fundamentally requires administrative privileges (`root` / `sudo`).
- **One-Command Helper Authorization (Recommended)**: To allow foreground TUI sessions and background agents to adjust fan speeds without needing `sudo` or password prompts every time, authorize the native helper once:
  ```bash
  sudo lazymacfan helper setup
  ```
  This applies `chmod 4755` (setuid root) to `lazymacfan-helper`. You can check the current status anytime:
  ```bash
  lazymacfan helper status
  ```

---

## ❓ Troubleshooting

### "Failed to set fan speed" or "Permission denied (kIOReturnNotPrivileged)"
- **Cause**: The kernel `AppleSMC` driver rejected write commands because the process lacks root privileges (`euid != 0`).
- **Fix**: Authorize the native helper binary with:
  ```bash
  sudo lazymacfan helper setup
  ```
  Or start the background controller daemon with sudo:
  ```bash
  sudo lazymacfan agent
  ```

---

## 📄 License

MIT License.
