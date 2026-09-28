import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { getLogDir } from "../config/persistence";

export const SERVICE_LABEL = "com.lazymacfan.agent";

export function getLaunchAgentPlistPath(): string {
  const dir = join(homedir(), "Library", "LaunchAgents");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, `${SERVICE_LABEL}.plist`);
}

export function generatePlistContent(executablePath: string): string {
  const logDir = getLogDir();
  const stdoutLog = join(logDir, "agent.stdout.log");
  const stderrLog = join(logDir, "agent.stderr.log");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${executablePath}</string>
        <string>agent</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${stdoutLog}</string>
    <key>StandardErrorPath</key>
    <string>${stderrLog}</string>
</dict>
</plist>
`;
}

export async function installService(executablePath: string): Promise<string> {
  const plistPath = getLaunchAgentPlistPath();
  const content = generatePlistContent(executablePath);
  writeFileSync(plistPath, content, "utf-8");
  return plistPath;
}

export async function uninstallService(): Promise<void> {
  const plistPath = getLaunchAgentPlistPath();
  if (existsSync(plistPath)) {
    try {
      await stopService();
    } catch {
      // ignore
    }
    unlinkSync(plistPath);
  }
}

export async function startService(executablePath?: string): Promise<void> {
  const plistPath = getLaunchAgentPlistPath();
  if (!existsSync(plistPath)) {
    const bin = executablePath ?? process.execPath;
    await installService(bin);
  }

  // Load into launchctl
  const proc = Bun.spawn(["launchctl", "load", "-w", plistPath], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
}

export async function stopService(): Promise<void> {
  const plistPath = getLaunchAgentPlistPath();
  if (!existsSync(plistPath)) return;

  const proc = Bun.spawn(["launchctl", "unload", "-w", plistPath], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
}

export async function getServiceStatus(): Promise<{
  installed: boolean;
  running: boolean;
  pid?: number;
}> {
  const plistPath = getLaunchAgentPlistPath();
  const installed = existsSync(plistPath);
  if (!installed) return { installed: false, running: false };

  const proc = Bun.spawn(["launchctl", "list"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  await proc.exited;

  for (const line of stdout.split("\n")) {
    if (line.includes(SERVICE_LABEL)) {
      const parts = line.trim().split(/\s+/);
      const pidStr = parts[0];
      const pid = pidStr && pidStr !== "-" ? parseInt(pidStr, 10) : undefined;
      return { installed: true, running: pid !== undefined, pid };
    }
  }

  return { installed: true, running: false };
}
