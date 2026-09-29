import { existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { stopService } from "../service/launchd";
import {
  createMacOSHardwareBackend,
  SYSTEM_HELPER_PATH,
  resolveHelperPath,
} from "../hardware/macos-backend";
import { runElevatedShellScript, posixQuote } from "../hardware/helper-auth";

export const handleUninstallCommand = async (args: string[]): Promise<void> => {
  const isPurge = args.includes("--purge");

  console.log("lazymacfan uninstaller\n");

  const execPath = process.execPath;
  const isBrew =
    execPath.includes("/Cellar/") ||
    execPath.includes("/opt/homebrew/") ||
    execPath.includes("/usr/local/Cellar/");

  if (isBrew) {
    console.log("Note: lazymacfan is installed via Homebrew.");
    console.log("To completely remove via Homebrew, run:\n  brew uninstall lazymacfan\n");
  }

  // 1. Stop and unload background launchd service
  console.log("Stopping and removing background launchd service...");
  try {
    await stopService();
    console.log("✓ Background service stopped and removed.");
  } catch (err) {
    console.log(`- Service cleanup note: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Restore fans to native macOS automatic control
  console.log("Restoring fans to native macOS AppleSMC automatic control...");
  try {
    const backend = createMacOSHardwareBackend();
    await backend.restoreAllAutomatic();
    console.log("✓ Fans restored to native macOS automatic control.");
  } catch (err) {
    console.log(`- Hardware note: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Remove privileged helper tool
  if (existsSync(SYSTEM_HELPER_PATH)) {
    console.log("Removing privileged helper tool...");
    if (typeof process.getuid === "function" && process.getuid() === 0) {
      rmSync(SYSTEM_HELPER_PATH, { force: true });
      console.log("✓ Removed " + SYSTEM_HELPER_PATH);
    } else {
      const res = runElevatedShellScript(
        [`rm -f ${posixQuote(SYSTEM_HELPER_PATH)}`],
        "lazymacfan requires administrator authorization to remove the privileged helper tool.",
      );
      if (res.success) {
        console.log("✓ Removed " + SYSTEM_HELPER_PATH);
      } else {
        console.warn("- Failed to remove helper tool via admin prompt: " + res.stderr);
      }
    }
  }

  // 4. Remove standalone binary if in a common install path
  const isInstalledBin =
    execPath.startsWith("/usr/local/bin") ||
    execPath.startsWith(join(homedir(), ".local/bin")) ||
    execPath.startsWith("/opt/homebrew/bin");

  if (isInstalledBin && !isBrew) {
    console.log(`Removing installed binary at ${execPath}...`);
    try {
      rmSync(execPath, { force: true });
      const helperAdjacent = resolveHelperPath();
      if (helperAdjacent && helperAdjacent !== SYSTEM_HELPER_PATH && existsSync(helperAdjacent)) {
        rmSync(helperAdjacent, { force: true });
      }
      console.log("✓ Removed executable binaries.");
    } catch {
      // Try with elevation
      const cmds = [`rm -f ${posixQuote(execPath)}`];
      const helperAdjacent = resolveHelperPath();
      if (helperAdjacent && helperAdjacent !== SYSTEM_HELPER_PATH) {
        cmds.push(`rm -f ${posixQuote(helperAdjacent)}`);
      }
      runElevatedShellScript(
        cmds,
        "lazymacfan requires authorization to remove installed binaries.",
      );
      console.log("✓ Removed executable binaries.");
    }
  }

  // 5. Purge configuration, state, and logs if requested
  if (isPurge) {
    const configDir = join(homedir(), ".config", "lazymacfan");
    if (existsSync(configDir)) {
      rmSync(configDir, { recursive: true, force: true });
      console.log("✓ Removed configuration directory (" + configDir + ").");
    }
    const sockPath = "/tmp/lazymacfan.sock";
    if (existsSync(sockPath)) {
      rmSync(sockPath, { force: true });
    }
    console.log("✓ Purged cache and runtime sockets.");
  } else {
    console.log("\nNote: Configuration directory was kept at ~/.config/lazymacfan.");
    console.log("To delete it completely, run: lazymacfan uninstall --purge");
  }

  console.log("\n🎉 lazymacfan uninstallation completed successfully.");
};
