import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { getLogDir } from "../config/persistence";
import { createIPCClient } from "../ipc/client";

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

export const resolveExecutablePath = (): string => {
  if (process.env["LAZYMACFAN_BIN"] && existsSync(process.env["LAZYMACFAN_BIN"])) {
    return process.env["LAZYMACFAN_BIN"];
  }

  // If running compiled standalone binary (e.g. dist/lazymacfan)
  if (!process.execPath.endsWith("/bun") && !process.execPath.endsWith("/node")) {
    return process.execPath;
  }

  // If in dev environment, prefer dist/lazymacfan if built
  const localDist = join(process.cwd(), "dist", "lazymacfan");
  if (existsSync(localDist)) {
    return localDist;
  }

  const systemPaths = ["/opt/homebrew/bin/lazymacfan", "/usr/local/bin/lazymacfan"];
  for (const p of systemPaths) {
    if (existsSync(p)) return p;
  }

  return process.execPath;
};

export const startService = async (executablePath?: string): Promise<void> => {
  const plistPath = getPlistPath();
  const bin = executablePath ?? resolveExecutablePath();
  if (!existsSync(plistPath)) {
    await installService(bin);
  }

  const proc = Bun.spawn(["launchctl", "load", "-w", plistPath], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
};

export const restartService = async (executablePath?: string): Promise<void> => {
  await stopService();
  await startService(executablePath);
};

const waitForAgent = async (
  client: ReturnType<typeof createIPCClient>,
  attempts: number,
): Promise<boolean> => {
  if (attempts <= 0) return client.isAgentRunning();
  if (await client.isAgentRunning()) return true;
  await new Promise((r) => setTimeout(r, 100));
  return waitForAgent(client, attempts - 1);
};

export const ensureAgentRunning = async (executablePath?: string): Promise<boolean> => {
  const client = createIPCClient();
  if (await client.isAgentRunning()) return true;

  const bin = executablePath ?? resolveExecutablePath();

  // 1. Try starting persistent background service via launchd
  try {
    await startService(bin);
    if (await waitForAgent(client, 25)) return true;
  } catch {
    // launchctl may fail in restricted/sandbox environments
  }

  // 2. Fallback: spawn detached background process
  try {
    const proc = Bun.spawn([bin, "agent"], {
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
    });
    proc.unref();

    if (await waitForAgent(client, 20)) return true;
  } catch {
    // ignore
  }

  return await client.isAgentRunning();
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
