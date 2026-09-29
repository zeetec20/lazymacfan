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
    const commands = [
      "mkdir -p /Library/PrivilegedHelperTools",
      `cp "${srcPath}" "${SYSTEM_HELPER_PATH}"`,
      `chown root:wheel "${SYSTEM_HELPER_PATH}" "${srcPath}"`,
      `chmod 4755 "${SYSTEM_HELPER_PATH}" "${srcPath}"`,
    ];

    const shellScript = commands.join(" && ");
    const osascriptCode = `do shell script "${shellScript}" with administrator privileges with prompt "${prompt}"`;

    const proc = Bun.spawnSync(["osascript", "-e", osascriptCode]);

    if (proc.exitCode !== 0) {
      const stderr = proc.stderr.toString().trim();
      return {
        success: false,
        error: stderr.includes("-128") ? "Authorization cancelled by user." : stderr,
      };
    }

    const priv = await checkHelperPrivileges();
    return { success: priv.privileged };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
