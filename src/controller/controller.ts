import type { HardwareProvider } from "../hardware/hardware";
import type { Fan } from "../types/fan";
import type { TemperatureSensor } from "../types/temperature";
import type { ControllerStatus } from "../types/controller";
import { type AppConfig, DEFAULT_FAN_CURVE } from "../config/config";
import { loadConfig, saveConfig, saveState } from "../config/persistence";
import { createSafetyGuardian } from "./safety";
import { calculateRpmFromCurve } from "./fan-control";

export interface FanControllerInstance {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  getStatus: () => ControllerStatus;
  getConfig: () => AppConfig;
  setMode: (mode: "auto" | "manual") => Promise<void>;
  setFanSpeed: (fanId: number, rpm: number) => Promise<void>;
  reloadConfig: () => void;
  evaluateCycle: () => Promise<void>;
  triggerTick: () => Promise<void>;
}

export type FanControllerService = FanControllerInstance;

export const createFanController = (
  hardware: HardwareProvider,
  initialConfig?: AppConfig,
): FanControllerInstance => {
  let config: AppConfig = initialConfig ?? loadConfig();
  const safety = createSafetyGuardian(config.controller.emergencyTempC);
  const lastAppliedRpm = new Map<number, number>();
  let isRunning = false;
  let startTime = Date.now();
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  let cachedFans: Fan[] = [];
  let cachedSensors: TemperatureSensor[] = [];
  let lastError: string | null = null;
  let isPrivileged = true;
  let cycleCount = 0;

  const getStatus = (): ControllerStatus => ({
    state: isRunning ? "running" : "stopped",
    pid: process.pid,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    mode: config.controller.mode,
    pollIntervalMs: config.controller.pollIntervalMs,
    emergencyTemperatureC: config.controller.emergencyTempC,
    fans: cachedFans,
    sensors: cachedSensors,
    lastUpdate: new Date().toISOString(),
    error: lastError ?? undefined,
    privileged: isPrivileged,
  });

  const getConfig = (): AppConfig => ({ ...config });

  const evaluateCycle = async (): Promise<void> => {
    cycleCount++;
    if (hardware.checkPrivileges && cycleCount % 3 === 0) {
      try {
        const priv = await hardware.checkPrivileges();
        isPrivileged = priv.privileged;
        if (isPrivileged && lastError?.includes("read-only")) {
          lastError = null;
        }
      } catch {
        // ignore
      }
    }

    cachedFans = await hardware.getFans();
    cachedSensors = await hardware.getSensors();

    const emergency = safety.checkEmergencyTemperature(cachedSensors);
    const writes: Promise<void>[] = [];

    for (const fan of cachedFans) {
      const fanConfig = config.fan[fan.id.toString()] ?? {};
      let desiredRpm: number;

      if (emergency.emergency && emergency.sensor) {
        desiredRpm = fan.maxRpm;
      } else if (config.controller.mode === "manual") {
        desiredRpm = fanConfig.targetRpm ?? fan.targetRpm ?? 2500;
      } else {
        const curve = fanConfig.automatic?.curve ?? DEFAULT_FAN_CURVE;
        const targetSensorId = fanConfig.automatic?.sensor ?? "auto";

        const temp =
          targetSensorId === "auto"
            ? cachedSensors.reduce((max, s) => (s.temperature > max ? s.temperature : max), 40)
            : (cachedSensors.find((s) => s.id === targetSensorId)?.temperature ?? 50);

        desiredRpm = calculateRpmFromCurve(temp, curve);
      }

      const safe = safety.evaluateTargetRpm(desiredRpm, fan, cachedSensors);
      const target = safe.clampedRpm;

      const prevApplied = lastAppliedRpm.get(fan.id);
      if (prevApplied === undefined || Math.abs(prevApplied - target) >= 20) {
        writes.push(
          hardware
            .setSpeed(fan.id, target)
            .then(() => {
              lastAppliedRpm.set(fan.id, target);
            })
            .catch((err) => {
              lastError = err instanceof Error ? err.message : String(err);
            }),
        );
      }
    }

    if (writes.length > 0) {
      await Promise.all(writes);
    }
  };

  const tick = async (): Promise<void> => {
    if (!isRunning) return;

    try {
      await evaluateCycle();
      lastError = null;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    saveState(getStatus());

    if (isRunning) {
      pollTimer = setTimeout(() => void tick(), config.controller.pollIntervalMs);
    }
  };

  const start = async (): Promise<void> => {
    if (isRunning) return;
    isRunning = true;
    startTime = Date.now();

    if (hardware.checkPrivileges) {
      try {
        const priv = await hardware.checkPrivileges();
        isPrivileged = priv.privileged;
        if (!isPrivileged && !lastError) {
          lastError =
            "Fan control is read-only (unprivileged). Run 'sudo lazymacfan helper setup' to enable control.";
        }
      } catch {
        // ignore
      }
    }

    await tick();
  };

  const stop = async (): Promise<void> => {
    isRunning = false;
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }

    try {
      await hardware.restoreAllAutomatic();
    } catch {
      // ignore on shutdown
    }

    saveState(getStatus());
  };

  const setMode = async (mode: "auto" | "manual"): Promise<void> => {
    if (!isPrivileged) {
      throw new Error("Permission denied: Fan control requires root privileges");
    }
    config.controller.mode = mode;
    saveConfig(config);
    if (mode === "auto") {
      await hardware.restoreAllAutomatic();
      lastAppliedRpm.clear();
    }
    await evaluateCycle();
  };

  const setFanSpeed = async (fanId: number, rpm: number): Promise<void> => {
    if (!isPrivileged) {
      throw new Error("Permission denied: Fan control requires root privileges");
    }
    const fan = cachedFans.find((f) => f.id === fanId);
    const min = fan ? fan.minRpm : 1200;
    const max = fan ? fan.maxRpm : 6000;
    const clamped = Math.max(min, Math.min(max, Math.round(rpm)));

    const fanKey = fanId.toString();
    const existing = config.fan[fanKey] ?? {};
    config.fan[fanKey] = {
      ...existing,
      targetRpm: clamped,
    };

    saveConfig(config);
    await hardware.setSpeed(fanId, clamped);
    lastAppliedRpm.set(fanId, clamped);
    await evaluateCycle();
  };

  const reloadConfig = (): void => {
    config = loadConfig();
    safety.setEmergencyThreshold(config.controller.emergencyTempC);
  };

  return {
    start,
    stop,
    getStatus,
    getConfig,
    setMode,
    setFanSpeed,
    reloadConfig,
    evaluateCycle,
    triggerTick: evaluateCycle,
  };
};

export const FanControllerService = createFanController;
