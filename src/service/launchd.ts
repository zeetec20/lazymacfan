import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { getLogDir } from "../config/persistence";

export const SERVICE_LABEL = "com.lazymacfan.agent";

export const isRoot = (): boolean => typeof process.getuid === "function" && process.getuid() === 0;

export const getPlistPath = (): string => {
  if (isRoot()) {
    const dir = "/Library/LaunchDaemons";
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return join(dir, `${SERVICE_LABEL}.plist`);
  }

  const dir = join(homedir(), "Library", "LaunchAgents");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, `${SERVICE_LABEL}.plist`);
};

export const getLaunchAgentPlistPath = getPlistPath;

export const generatePlistContent = (executablePath: string): string => {
  const logDir = isRoot() ? "/var/log/lazymacfan" : getLogDir();
  if (!existsSync(logDir)) {
    try {
      mkdirSync(logDir, { recursive: true });
    } catch {
      // fallback
    }
  }
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
};

export const installService = async (executablePath: string): Promise<string> => {
  const plistPath = getPlistPath();
  const content = generatePlistContent(executablePath);
  writeFileSync(plistPath, content, "utf-8");
  return plistPath;
};

export const stopService = async (): Promise<void> => {
  const plistPath = getPlistPath();
  if (!existsSync(plistPath)) return;

  const proc = Bun.spawn(["launchctl", "unload", "-w", plistPath], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
};

export const uninstallService = async (): Promise<void> => {
  const plistPath = getPlistPath();
  if (existsSync(plistPath)) {
    try {
      await stopService();
    } catch {
      // ignore
    }
    unlinkSync(plistPath);
  }
};

export const startService = async (executablePath?: string): Promise<void> => {
  const plistPath = getPlistPath();
  if (!existsSync(plistPath)) {
    const bin = executablePath ?? process.execPath;
    await installService(bin);
  }

  const proc = Bun.spawn(["launchctl", "load", "-w", plistPath], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
};

export const getServiceStatus = async (): Promise<{
  installed: boolean;
  running: boolean;
  isDaemon?: boolean;
  pid?: number;
}> => {
  const daemonPath = `/Library/LaunchDaemons/${SERVICE_LABEL}.plist`;
  const agentPath = join(homedir(), "Library", "LaunchAgents", `${SERVICE_LABEL}.plist`);

  const installed = existsSync(daemonPath) || existsSync(agentPath);
  if (!installed) return { installed: false, running: false };

  const isDaemon = existsSync(daemonPath);

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
      return { installed: true, running: pid !== undefined, isDaemon, pid };
    }
  }

  return { installed: true, running: false, isDaemon };
};
