import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse, stringify } from "smol-toml";
import { type AppConfig, DEFAULT_CONFIG } from "./config";
import type { ControllerStatus } from "../types/controller";

/** Expand a leading `~` to the user's home directory. */
export const expandHome = (path: string): string => {
  const p = path.trim();
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
};

const baseConfigDir =
  process.env.XDG_CONFIG_HOME && process.env.XDG_CONFIG_HOME.trim()
    ? process.env.XDG_CONFIG_HOME
    : join(homedir(), ".config");

export const CONFIG_DIR = join(baseConfigDir, "lazymacfan");
export const CONFIG_FILE = join(CONFIG_DIR, "config.toml");
export const STATE_FILE = join(CONFIG_DIR, "state.json");
export const USER_SOCKET_FILE = join(CONFIG_DIR, "lazymacfan.sock");

export const getAppDataDir = (): string => {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  return CONFIG_DIR;
};

export const getLogDir = (): string => {
  const home = homedir();
  const dir =
    process.platform === "darwin"
      ? join(home, "Library", "Logs", "lazymacfan")
      : join(home, ".local", "state", "lazymacfan");

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
};

export const getConfigPath = (): string => CONFIG_FILE;
export const getStatePath = (): string => STATE_FILE;

export const SHARED_SOCKET_PATHS = ["/var/run/lazymacfan.sock", "/tmp/lazymacfan.sock"];

export const getSocketPath = (): string => {
  if (
    process.platform === "darwin" &&
    typeof process.getuid === "function" &&
    process.getuid() === 0
  ) {
    return "/var/run/lazymacfan.sock";
  }
  return USER_SOCKET_FILE;
};

export const resolveActiveSocketPath = (): string => {
  if (existsSync(USER_SOCKET_FILE)) return USER_SOCKET_FILE;

  for (const shared of SHARED_SOCKET_PATHS) {
    if (existsSync(shared)) return shared;
  }

  return USER_SOCKET_FILE;
};

export const getLogPath = (): string => join(getLogDir(), "lazymacfan.log");

export const loadConfig = (): AppConfig => {
  const path = CONFIG_FILE;
  const legacyPath = join(homedir(), "Library", "Application Support", "lazymacfan", "config.toml");

  if (!existsSync(path) && existsSync(legacyPath)) {
    try {
      getAppDataDir();
      const rawLegacy = readFileSync(legacyPath, "utf-8");
      writeFileSync(path, rawLegacy, "utf-8");
    } catch {
      // ignore
    }
  }

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
};

export const saveConfig = (config: AppConfig): void => {
  getAppDataDir();
  const content = stringify(config as unknown as Record<string, unknown>);
  writeFileSync(CONFIG_FILE, content, "utf-8");
};

export interface RuntimeState {
  controller: string;
  pid: number;
  lastUpdate: string;
  mode: string;
}

export const loadState = (): RuntimeState | null => {
  if (!existsSync(STATE_FILE)) return null;
  try {
    const raw = readFileSync(STATE_FILE, "utf-8");
    return JSON.parse(raw) as RuntimeState;
  } catch {
    return null;
  }
};

export const saveState = (status: ControllerStatus): void => {
  getAppDataDir();
  const state: RuntimeState = {
    controller: status.state,
    pid: status.pid,
    lastUpdate: status.lastUpdate,
    mode: status.mode,
  };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
};
