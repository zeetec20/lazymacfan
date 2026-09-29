import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { HardwareProvider } from "./hardware";
import type { Fan } from "../types/fan";
import type { TemperatureSensor } from "../types/temperature";

export interface MacOSHardwareBackendInstance extends HardwareProvider {
  checkPrivileges: () => Promise<{ privileged: boolean; euid?: number; uid?: number }>;
  getAll: () => Promise<{ fans: Fan[]; sensors: TemperatureSensor[] }>;
  isLidClosed: () => Promise<boolean>;
}

export const SYSTEM_HELPER_PATH = "/Library/PrivilegedHelperTools/lazymacfan-helper";

export const resolveHelperPath = (): string | null => {
  if (process.env["LAZYMACFAN_HELPER_PATH"] && existsSync(process.env["LAZYMACFAN_HELPER_PATH"])) {
    return process.env["LAZYMACFAN_HELPER_PATH"];
  }

  const execDir = dirname(process.execPath);
  const adjacent = join(execDir, "lazymacfan-helper");
  if (existsSync(adjacent)) return adjacent;

  const candidates = [
    SYSTEM_HELPER_PATH,
    join(process.cwd(), "dist", "lazymacfan-helper"),
    join(dirname(new URL(import.meta.url).pathname), "..", "..", "dist", "lazymacfan-helper"),
    "/opt/homebrew/bin/lazymacfan-helper",
    "/usr/local/bin/lazymacfan-helper",
  ];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
};

export const createMacOSHardwareBackend = (): MacOSHardwareBackendInstance => {
  const isAvailable = async (): Promise<boolean> => {
    if (process.platform !== "darwin") return false;
    const path = resolveHelperPath();
    return path !== null && existsSync(path);
  };

  const runHelper = async (args: string[]): Promise<string> => {
    const helper = resolveHelperPath();
    if (!helper) {
      throw new Error(
        "lazymacfan-helper binary not found. Build it with 'bun run build' or check installation.",
      );
    }

    const proc = Bun.spawn([helper, ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(`Helper failed (${exitCode}): ${stderr.trim() || stdout.trim()}`);
    }

    return stdout.trim();
  };

  const getFans = async (): Promise<Fan[]> => {
    const raw = await runHelper(["--fans"]);
    const parsed = JSON.parse(raw) as { fans?: Fan[]; error?: string };
    if (parsed.error) throw new Error(parsed.error);
    return parsed.fans ?? [];
  };

  const getSensors = async (): Promise<TemperatureSensor[]> => {
    const raw = await runHelper(["--sensors"]);
    const parsed = JSON.parse(raw) as { sensors?: TemperatureSensor[]; error?: string };
    if (parsed.error) throw new Error(parsed.error);
    return parsed.sensors ?? [];
  };

  const getAll = async (): Promise<{ fans: Fan[]; sensors: TemperatureSensor[] }> => {
    const raw = await runHelper(["--json"]);
    const parsed = JSON.parse(raw) as {
      fans?: Fan[];
      sensors?: TemperatureSensor[];
      error?: string;
    };
    if (parsed.error) throw new Error(parsed.error);
    return {
      fans: parsed.fans ?? [],
      sensors: parsed.sensors ?? [],
    };
  };

  const checkPrivileges = async (): Promise<{
    privileged: boolean;
    euid?: number;
    uid?: number;
  }> => {
    if (process.platform !== "darwin") return { privileged: false };
    try {
      const raw = await runHelper(["--check-privileges"]);
      return JSON.parse(raw) as { privileged: boolean; euid?: number; uid?: number };
    } catch {
      return { privileged: false };
    }
  };

  const setSpeed = async (fanId: number, rpm: number): Promise<void> => {
    const raw = await runHelper(["--set-fan", fanId.toString(), rpm.toString()]);
    const parsed = JSON.parse(raw) as { success: boolean; error?: string; code?: string };
    if (!parsed.success) {
      if (parsed.code === "EPERM" || /permission denied|privilege/i.test(parsed.error ?? "")) {
        throw new Error(
          "Permission denied: AppleSMC write requires root privileges. Run 'sudo lazymacfan helper setup' to authorize the helper tool.",
        );
      }
      throw new Error(parsed.error ?? "Failed to set fan speed.");
    }
  };

  const restoreAutomatic = async (fanId: number): Promise<void> => {
    const raw = await runHelper(["--auto", fanId.toString()]);
    const parsed = JSON.parse(raw) as { success: boolean; error?: string; code?: string };
    if (!parsed.success) {
      if (parsed.code === "EPERM" || /permission denied|privilege/i.test(parsed.error ?? "")) {
        throw new Error(
          "Permission denied: AppleSMC write requires root privileges. Run 'sudo lazymacfan helper setup' to authorize the helper tool.",
        );
      }
      throw new Error(parsed.error ?? "Failed to restore fan to auto mode.");
    }
  };

  const restoreAllAutomatic = async (): Promise<void> => {
    const raw = await runHelper(["--auto-all"]);
    const parsed = JSON.parse(raw) as { success: boolean; error?: string; code?: string };
    if (!parsed.success) {
      if (parsed.code === "EPERM" || /permission denied|privilege/i.test(parsed.error ?? "")) {
        throw new Error(
          "Permission denied: AppleSMC write requires root privileges. Run 'sudo lazymacfan helper setup' to authorize the helper tool.",
        );
      }
      throw new Error(parsed.error ?? "Failed to restore fans to auto mode.");
    }
  };

  const isLidClosed = async (): Promise<boolean> => {
    if (process.platform !== "darwin") return false;
    try {
      const raw = await runHelper(["--clamshell"]);
      const parsed = JSON.parse(raw) as { success: boolean; clamshellClosed?: boolean };
      if (typeof parsed.clamshellClosed === "boolean") {
        return parsed.clamshellClosed;
      }
    } catch {
      // Fallback to ioreg command if helper does not support --clamshell or helper call fails
      try {
        const proc = Bun.spawn(["ioreg", "-r", "-k", "AppleClamshellState", "-d", "4"], {
          stdout: "pipe",
          stderr: "pipe",
        });
        const out = await new Response(proc.stdout).text();
        await proc.exited;
        return /"AppleClamshellState"\s*=\s*Yes/i.test(out);
      } catch {
        return false;
      }
    }
    return false;
  };

  return {
    isAvailable,
    getFans,
    getSensors,
    getAll,
    checkPrivileges,
    setSpeed,
    restoreAutomatic,
    restoreAllAutomatic,
    isLidClosed,
  };
};

export type MacOSHardwareBackend = MacOSHardwareBackendInstance;
export const MacOSHardwareBackend = createMacOSHardwareBackend;
