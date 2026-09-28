import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse, stringify } from "smol-toml";
import { type AppConfig, DEFAULT_CONFIG } from "./config";
import type { ControllerStatus } from "../types/controller";

export function getAppDataDir(): string {
  const home = homedir();
  const dir =
    process.platform === "darwin"
      ? join(home, "Library", "Application Support", "lazymacfan")
      : join(home, ".config", "lazymacfan");

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getLogDir(): string {
  const home = homedir();
  const dir =
    process.platform === "darwin"
      ? join(home, "Library", "Logs", "lazymacfan")
      : join(home, ".local", "state", "lazymacfan");

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getConfigPath(): string {
  return join(getAppDataDir(), "config.toml");
}

export function getStatePath(): string {
  return join(getAppDataDir(), "state.json");
}

export function getSocketPath(): string {
  return join(getAppDataDir(), "lazymacfan.sock");
}

export function getLogPath(): string {
  return join(getLogDir(), "lazymacfan.log");
}

export function loadConfig(): AppConfig {
  const path = getConfigPath();
  if (!existsSync(path)) {
    saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = parse(raw) as unknown as AppConfig;
    return {
      controller: {
        ...DEFAULT_CONFIG.controller,
        ...(parsed.controller ?? {}),
      },
      fan: parsed.fan ?? DEFAULT_CONFIG.fan,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: AppConfig): void {
  const path = getConfigPath();
  const content = stringify(config as unknown as Record<string, unknown>);
  writeFileSync(path, content, "utf-8");
}

export interface RuntimeState {
  controller: string;
  pid: number;
  lastUpdate: string;
  mode: string;
}

export function loadState(): RuntimeState | null {
  const path = getStatePath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as RuntimeState;
  } catch {
    return null;
  }
}

export function saveState(status: ControllerStatus): void {
  const path = getStatePath();
  const state: RuntimeState = {
    controller: status.state,
    pid: status.pid,
    lastUpdate: status.lastUpdate,
    mode: status.mode,
  };
  writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
}
