import { existsSync, readFileSync, statSync } from "node:fs";
import { createIPCClient } from "../ipc/client";
import { runAgentDaemon } from "../daemon/agent";
import { runTui } from "../tui/app";
import { getLogPath } from "../config/persistence";
import { getServiceStatus, startService, stopService } from "../service/launchd";
import {
  checkHelperPrivileges,
  authorizeHelper,
  resolveHelperPath,
  SYSTEM_HELPER_PATH,
} from "../hardware/helper-auth";

const VERSION = "0.1.0";

const printHelp = (): void => {
  console.log(`lazymacfan v${VERSION} — macOS Fan Control & Temperature Monitor

USAGE:
  lazymacfan                      Launch interactive Terminal UI (OpenTUI)
  lazymacfan agent                Run persistent background controller daemon
  lazymacfan status               Show controller and hardware status
  lazymacfan fans                 List detected fans and speeds
  lazymacfan sensors              List temperature sensors
  lazymacfan fan <id> --rpm <rpm> Set fan speed manually
  lazymacfan mode <auto|manual>   Switch between auto and manual fan modes
  lazymacfan helper <command>     Manage helper permissions (setuid root for AppleSMC)
  lazymacfan service <command>    Manage background launchd service
  lazymacfan logs [--follow]      View background agent logs
  lazymacfan --version, -v        Print version information
  lazymacfan --help, -h           Show this help message

HELPER COMMANDS:
  status                          Check if helper binary has root privileges
  setup                           Authorize helper binary with setuid root (requires sudo)

SERVICE COMMANDS:
  start                           Install and start background launchd agent
  stop                            Stop background launchd agent
  restart                         Restart background launchd agent
  status                          Check launchd agent status
`);
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    await runTui();
    return;
  }

  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(`lazymacfan v${VERSION}`);
    return;
  }

  if (command === "agent") {
    await runAgentDaemon();
    return;
  }

  const client = createIPCClient();

  if (command === "status") {
    try {
      const status = await client.getStatus();
      const cpu = status.sensors.find((s) => /cpu|tdie/i.test(s.name));
      const cpuStr = cpu ? `${cpu.temperature.toFixed(1)}°C` : "N/A";
      const h = Math.floor(status.uptimeSeconds / 3600);
      const m = Math.floor((status.uptimeSeconds % 3600) / 60);

      console.log("lazymacfan controller\n");
      console.log(`Status:       ${status.state === "running" ? "Running" : "Stopped"}`);
      console.log(`PID:          ${status.pid}`);
      console.log(`Mode:         ${status.mode === "manual" ? "Manual" : "Automatic"}`);
      for (const fan of status.fans) {
        console.log(
          `${fan.name}:        ${Math.round(fan.currentRpm)} RPM (Target: ${Math.round(fan.targetRpm)} RPM)`,
        );
      }
      console.log(`CPU:          ${cpuStr}`);
      console.log(`Uptime:       ${h}h ${m}m`);
      const privStr =
        status.privileged === false
          ? "Read-Only (Run 'sudo lazymacfan helper setup' to enable control)"
          : "Full Control (Read/Write)";
      console.log(`Privileges:   ${privStr}`);
      if (status.error) {
        console.log(`Notice:       ${status.error}`);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  if (command === "fans") {
    try {
      const fans = await client.getFans();
      if (fans.length === 0) {
        console.log("No fans detected.");
        return;
      }
      console.log("ID    NAME        CURRENT    TARGET     MIN        MAX        MODE");
      console.log("─".repeat(68));
      for (const f of fans) {
        const id = f.id.toString().padEnd(6);
        const name = f.name.padEnd(12);
        const cur = `${Math.round(f.currentRpm)} RPM`.padEnd(11);
        const tgt = `${Math.round(f.targetRpm)} RPM`.padEnd(11);
        const min = `${Math.round(f.minRpm)} RPM`.padEnd(11);
        const max = `${Math.round(f.maxRpm)} RPM`.padEnd(11);
        const mode = f.mode.toUpperCase();
        console.log(`${id}${name}${cur}${tgt}${min}${max}${mode}`);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  if (command === "sensors") {
    try {
      const sensors = await client.getSensors();
      if (sensors.length === 0) {
        console.log("No sensors detected.");
        return;
      }
      console.log("ID              NAME                            TEMP        SOURCE");
      console.log("─".repeat(70));
      for (const s of sensors) {
        const id = s.id.padEnd(16);
        const name = (s.name.length > 30 ? s.name.slice(0, 28) + ".." : s.name).padEnd(32);
        const temp = `${s.temperature.toFixed(1)}°C`.padEnd(12);
        const src = s.source.toUpperCase();
        console.log(`${id}${name}${temp}${src}`);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  if (command === "fan") {
    const fanIdStr = args[1];
    const rpmFlagIndex = args.indexOf("--rpm");
    if (!fanIdStr || rpmFlagIndex === -1 || !args[rpmFlagIndex + 1]) {
      console.error("Usage: lazymacfan fan <id> --rpm <rpm>");
      process.exit(1);
    }

    const fanId = parseInt(fanIdStr, 10);
    const rpm = parseInt(args[rpmFlagIndex + 1] ?? "0", 10);

    try {
      await client.setFanSpeed(fanId, rpm);
      console.log(`Set Fan ${fanId} target speed to ${rpm} RPM (Mode: Manual)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/permission denied|privilege|EPERM/i.test(msg)) {
        console.error(`\n❌ Fan Speed Control Error:\n${msg}`);
        console.error(
          "\n💡 To enable hardware fan control, authorize the helper binary with setuid root:\n  sudo lazymacfan helper setup\n",
        );
      } else {
        console.error(msg);
      }
      process.exit(1);
    }
    return;
  }

  if (command === "mode") {
    const modeStr = args[1]?.toLowerCase();
    if (modeStr !== "auto" && modeStr !== "manual") {
      console.error("Usage: lazymacfan mode <auto|manual>");
      process.exit(1);
    }

    try {
      await client.setMode(modeStr);
      console.log(`Controller mode set to: ${modeStr.toUpperCase()}`);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  if (command === "helper") {
    const sub = args[1] ?? "status";
    const helperPath = resolveHelperPath();

    if (!helperPath) {
      console.error(
        "lazymacfan-helper binary not found. Build it with 'bun run build' or check installation.",
      );
      process.exit(1);
    }

    if (sub === "status") {
      const privInfo = await checkHelperPrivileges();
      const stat = existsSync(helperPath) ? statSync(helperPath) : undefined;
      const isSetuid = stat ? (stat.mode & 0o4000) !== 0 : false;
      const isRootOwner = stat ? stat.uid === 0 : false;

      console.log("lazymacfan-helper status\n");
      console.log(`Active Path:  ${helperPath}`);
      console.log(
        `System Path:  ${SYSTEM_HELPER_PATH} (${existsSync(SYSTEM_HELPER_PATH) ? "Installed" : "Not installed"})`,
      );
      if (stat) {
        console.log(`Owner UID:    ${stat.uid} (${isRootOwner ? "root" : "non-root"})`);
        console.log(
          `Permissions:  ${(stat.mode & 0o7777).toString(8)} (${isSetuid ? "setuid root enabled" : "setuid root disabled"})`,
        );
      }
      console.log(
        `Privileges:   ${privInfo.privileged ? "✅ Full Control (Writing to AppleSMC allowed)" : "🔒 Read-Only (Root required for fan speed control)"}`,
      );
      if (!privInfo.privileged) {
        console.log(
          "\n💡 To authorize fan control for normal users and background daemon, run:\n  lazymacfan helper setup\n",
        );
      }
      return;
    }

    if (sub === "setup") {
      console.log(`Authorizing helper at: ${helperPath}`);
      const res = await authorizeHelper();
      if (res.success) {
        console.log("✅ Successfully authorized lazymacfan-helper with setuid root permissions!");
        console.log(
          "Standard users and background daemons can now adjust fan speeds without sudo.\n",
        );
      } else {
        console.error(`❌ Helper authorization failed: ${res.error ?? "Unknown error"}`);
        process.exit(1);
      }
      return;
    }

    console.error(
      "Unknown helper command. Use 'lazymacfan helper status' or 'lazymacfan helper setup'.",
    );
    process.exit(1);
  }

  if (command === "service") {
    const sub = args[1];
    if (sub === "start") {
      try {
        await startService();
        console.log("Started lazymacfan launchd background service.");
      } catch (err) {
        console.error(`Failed to start service: ${String(err)}`);
      }
      return;
    }
    if (sub === "stop") {
      try {
        await stopService();
        console.log("Stopped lazymacfan launchd background service.");
      } catch (err) {
        console.error(`Failed to stop service: ${String(err)}`);
      }
      return;
    }
    if (sub === "restart") {
      try {
        await stopService();
        await startService();
        console.log("Restarted lazymacfan launchd background service.");
      } catch (err) {
        console.error(`Failed to restart service: ${String(err)}`);
      }
      return;
    }
    if (sub === "status") {
      try {
        const s = await getServiceStatus();
        console.log(`Service Installed: ${s.installed ? "Yes" : "No"}`);
        console.log(`Service Running:   ${s.running ? `Yes (PID: ${s.pid})` : "No"}`);
      } catch (err) {
        console.error(`Failed to query service: ${String(err)}`);
      }
      return;
    }
    console.error("Unknown service command. Use start, stop, restart, or status.");
    process.exit(1);
  }

  if (command === "logs") {
    const logFile = getLogPath();
    if (!existsSync(logFile)) {
      console.log(`No log file found at ${logFile}`);
      return;
    }

    const follow = args.includes("--follow") || args.includes("-f");
    if (!follow) {
      const content = readFileSync(logFile, "utf-8");
      const lines = content.trim().split("\n");
      console.log(lines.slice(-50).join("\n"));
      return;
    }

    const proc = Bun.spawn(["tail", "-f", "-n", "30", logFile], {
      stdout: "inherit",
      stderr: "inherit",
    });
    process.on("SIGINT", () => {
      proc.kill();
      process.exit(0);
    });
    await proc.exited;
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
};

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
