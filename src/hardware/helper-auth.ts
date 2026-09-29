import { existsSync, mkdirSync, statSync } from "node:fs";
export { SYSTEM_HELPER_PATH, resolveHelperPath } from "./macos-backend";
import { createMacOSHardwareBackend, SYSTEM_HELPER_PATH, resolveHelperPath } from "./macos-backend";

/**
 * Checks whether lazymacfan-helper has setuid root privileges.
 */
export const checkHelperPrivileges = async (): Promise<{
  privileged: boolean;
  path: string | null;
  ownerUid?: number;
  mode?: number;
  isSetuid?: boolean;
}> => {
  if (process.platform !== "darwin") {
    return { privileged: true, path: null };
  }

  const path = resolveHelperPath();
  if (!path) {
    return { privileged: false, path: null };
  }

  try {
    const stat = statSync(path);
    const isSetuid = (stat.mode & 0o4000) !== 0;
    const isRootOwner = stat.uid === 0;

    const backend = createMacOSHardwareBackend();
    const priv = await backend.checkPrivileges();

    return {
      privileged: priv.privileged || (isSetuid && isRootOwner),
      path,
      ownerUid: stat.uid,
      mode: stat.mode,
      isSetuid,
    };
  } catch {
    return { privileged: false, path };
  }
};

export const posixQuote = (str: string): string => `'${str.replace(/'/g, "'\\''")}'`;

/**
 * Runs a list of shell commands with administrator privileges via macOS osascript,
 * correctly escaping arguments for both POSIX shell and AppleScript string literals.
 */
export const runElevatedShellScript = (
  commands: string[],
  prompt: string,
): { success: boolean; exitCode: number; stdout: string; stderr: string; cancelled: boolean } => {
  const shellScript = commands.join(" && ");
  const escapedAppleScript = shellScript.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const escapedPrompt = prompt.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const osascriptCode = `do shell script "${escapedAppleScript}" with administrator privileges with prompt "${escapedPrompt}"`;

  const proc = Bun.spawnSync(["osascript", "-e", osascriptCode]);
  const stderr = proc.stderr.toString().trim();
  const stdout = proc.stdout.toString().trim();
  const cancelled = stderr.includes("-128");

  return {
    success: proc.exitCode === 0,
    exitCode: proc.exitCode,
    stdout,
    stderr,
    cancelled,
  };
};

/**
 * Automatically authorizes lazymacfan-helper with setuid root permissions.
 * If running under sudo, executes direct chmod/chown commands.
 * If running as regular user, triggers the macOS native authorization dialog via osascript.
 */
export const authorizeHelper = async (
  promptMessage?: string,
): Promise<{ success: boolean; error?: string }> => {
  if (process.platform !== "darwin") {
    return { success: true };
  }

  // Find a source helper binary to authorize
  const srcPath = resolveHelperPath();
  if (!srcPath) {
    return {
      success: false,
      error: "lazymacfan-helper binary not found. Build it with 'bun run build' first.",
    };
  }

  const prompt =
    promptMessage ??
    "lazymacfan requires administrative privileges to authorize fan speed control (AppleSMC write access).";

  // If already root, perform direct setup
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    try {
      if (!existsSync("/Library/PrivilegedHelperTools")) {
        mkdirSync("/Library/PrivilegedHelperTools", { recursive: true });
      }

      // Copy to system privileged location if different
      if (srcPath !== SYSTEM_HELPER_PATH) {
        Bun.spawnSync(["cp", srcPath, SYSTEM_HELPER_PATH]);
        Bun.spawnSync(["chown", "root:wheel", SYSTEM_HELPER_PATH]);
        Bun.spawnSync(["chmod", "4755", SYSTEM_HELPER_PATH]);
      }

      Bun.spawnSync(["chown", "root:wheel", srcPath]);
      Bun.spawnSync(["chmod", "4755", srcPath]);

      const priv = await checkHelperPrivileges();
      return { success: priv.privileged };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Not root: execute via osascript with administrator privileges
  try {
    const commands = ["mkdir -p /Library/PrivilegedHelperTools"];
    if (srcPath !== SYSTEM_HELPER_PATH) {
      commands.push(`cp ${posixQuote(srcPath)} ${posixQuote(SYSTEM_HELPER_PATH)}`);
      commands.push(`chown root:wheel ${posixQuote(SYSTEM_HELPER_PATH)} ${posixQuote(srcPath)}`);
      commands.push(`chmod 4755 ${posixQuote(SYSTEM_HELPER_PATH)} ${posixQuote(srcPath)}`);
    } else {
      commands.push(`chown root:wheel ${posixQuote(SYSTEM_HELPER_PATH)}`);
      commands.push(`chmod 4755 ${posixQuote(SYSTEM_HELPER_PATH)}`);
    }

    const res = runElevatedShellScript(commands, prompt);

    if (!res.success) {
      return {
        success: false,
        error: res.cancelled ? "Authorization cancelled by user." : res.stderr,
      };
    }

    const priv = await checkHelperPrivileges();
    return { success: priv.privileged };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

/**
 * Ensures helper is authorized before operations that require root SMC access.
 * If unprivileged, automatically triggers macOS GUI prompt.
 */
export const ensureHelperAuthorized = async (options?: { silent?: boolean }): Promise<boolean> => {
  if (process.platform !== "darwin") return true;

  const priv = await checkHelperPrivileges();
  if (priv.privileged) return true;

  if (process.env["LAZYMACFAN_NO_AUTH"] === "1") return false;

  if (!options?.silent) {
    console.log("Hardware fan control helper requires one-time administrator authorization.");
    console.log("Requesting authorization via macOS system dialog (Touch ID / Password)...");
  }

  const res = await authorizeHelper();
  if (res.success) {
    if (!options?.silent) {
      console.log("✅ Helper authorized successfully with full fan control.\n");
    }
    return true;
  }

  if (!options?.silent) {
    console.warn(`Notice: ${res.error ?? "Authorization cancelled"}. Running in read-only mode.\n`);
  }
  return false;
};
