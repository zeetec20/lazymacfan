import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { HardwareProvider } from "./hardware";
import type { Fan } from "../types/fan";
import type { TemperatureSensor } from "../types/temperature";

export class MacOSHardwareBackend implements HardwareProvider {
  private helperPath: string | null = null;

  constructor() {
    this.helperPath = this.resolveHelperPath();
  }

  private resolveHelperPath(): string | null {
    if (
      process.env["LAZYMACFAN_HELPER_PATH"] &&
      existsSync(process.env["LAZYMACFAN_HELPER_PATH"])
    ) {
      return process.env["LAZYMACFAN_HELPER_PATH"];
    }

    const execDir = dirname(process.execPath);
    const adjacent = join(execDir, "lazymacfan-helper");
    if (existsSync(adjacent)) return adjacent;

    const candidates = [
      join(process.cwd(), "dist", "lazymacfan-helper"),
      join(dirname(new URL(import.meta.url).pathname), "..", "..", "dist", "lazymacfan-helper"),
      "/opt/homebrew/bin/lazymacfan-helper",
      "/usr/local/bin/lazymacfan-helper",
    ];

    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
    return null;
  }

  public async isAvailable(): Promise<boolean> {
    if (process.platform !== "darwin") return false;
    const path = this.resolveHelperPath();
    return path !== null && existsSync(path);
  }

  private async runHelper(args: string[]): Promise<string> {
    const helper = this.resolveHelperPath();
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
  }

  public async getFans(): Promise<Fan[]> {
    const raw = await this.runHelper(["--fans"]);
    const parsed = JSON.parse(raw) as { fans?: Fan[]; error?: string };
    if (parsed.error) throw new Error(parsed.error);
    return parsed.fans ?? [];
  }

  public async getSensors(): Promise<TemperatureSensor[]> {
    const raw = await this.runHelper(["--sensors"]);
    const parsed = JSON.parse(raw) as { sensors?: TemperatureSensor[]; error?: string };
    if (parsed.error) throw new Error(parsed.error);
    return parsed.sensors ?? [];
  }

  public async getAll(): Promise<{ fans: Fan[]; sensors: TemperatureSensor[] }> {
    const raw = await this.runHelper(["--json"]);
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
  }

  public async setSpeed(fanId: number, rpm: number): Promise<void> {
    const raw = await this.runHelper(["--set-fan", fanId.toString(), rpm.toString()]);
    const parsed = JSON.parse(raw) as { success: boolean; error?: string };
    if (!parsed.success) {
      throw new Error(
        parsed.error ??
          "Unable to set fan speed. Elevated privileges (sudo) may be required on macOS.",
      );
    }
  }

  public async restoreAutomatic(fanId: number): Promise<void> {
    const raw = await this.runHelper(["--auto", fanId.toString()]);
    const parsed = JSON.parse(raw) as { success: boolean; error?: string };
    if (!parsed.success) {
      throw new Error(parsed.error ?? "Failed to restore fan to auto mode");
    }
  }

  public async restoreAllAutomatic(): Promise<void> {
    const raw = await this.runHelper(["--auto-all"]);
    const parsed = JSON.parse(raw) as { success: boolean; error?: string };
    if (!parsed.success) {
      throw new Error(parsed.error ?? "Failed to restore fans to auto mode");
    }
  }
}
