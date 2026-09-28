import type { HardwareProvider } from "../hardware/hardware";
import type { Fan } from "../types/fan";
import type { TemperatureSensor } from "../types/temperature";
import type { ControllerStatus } from "../types/controller";
import { type AppConfig, DEFAULT_FAN_CURVE } from "../config/config";
import { loadConfig, saveConfig, saveState } from "../config/persistence";
import { SafetyGuardian } from "./safety";
import { calculateRpmFromCurve } from "./fan-control";

export class FanControllerService {
  private hardware: HardwareProvider;
  private config: AppConfig;
  private safety: SafetyGuardian;
  private isRunning = false;
  private startTime = Date.now();
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  private cachedFans: Fan[] = [];
  private cachedSensors: TemperatureSensor[] = [];
  private lastAppliedRpm: Map<number, number> = new Map();
  private lastError: string | null = null;

  constructor(hardware: HardwareProvider, initialConfig?: AppConfig) {
    this.hardware = hardware;
    this.config = initialConfig ?? loadConfig();
    this.safety = new SafetyGuardian(this.config.controller.emergencyTempC);
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now();
    await this.tick();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    try {
      await this.hardware.restoreAllAutomatic();
    } catch {
      // ignore on shutdown
    }

    saveState(this.getStatus());
  }

  private async tick(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.evaluateCycle();
      this.lastError = null;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
    }

    saveState(this.getStatus());

    if (this.isRunning) {
      this.pollTimer = setTimeout(() => void this.tick(), this.config.controller.pollIntervalMs);
    }
  }

  public async evaluateCycle(): Promise<void> {
    // 1. Telemetry read
    this.cachedFans = await this.hardware.getFans();
    this.cachedSensors = await this.hardware.getSensors();

    const emergency = this.safety.checkEmergencyTemperature(this.cachedSensors);

    const writes: Promise<void>[] = [];

    for (const fan of this.cachedFans) {
      const fanConfig = this.config.fan[fan.id.toString()] ?? {};
      let desiredRpm: number;

      if (emergency.emergency && emergency.sensor) {
        // Emergency 95°C override
        desiredRpm = fan.maxRpm;
      } else if (this.config.controller.mode === "manual") {
        desiredRpm = fanConfig.targetRpm ?? fan.targetRpm ?? 2500;
      } else {
        // Automatic mode using fan curve
        const curve = fanConfig.automatic?.curve ?? DEFAULT_FAN_CURVE;
        const targetSensorId = fanConfig.automatic?.sensor ?? "auto";

        // Find relevant temperature
        let temp = 45;
        if (targetSensorId === "auto") {
          // Use maximum available sensor temperature
          const maxSensor = this.cachedSensors.reduce(
            (max, s) => (s.temperature > max ? s.temperature : max),
            40,
          );
          temp = maxSensor;
        } else {
          const match = this.cachedSensors.find((s) => s.id === targetSensorId);
          temp = match ? match.temperature : 50;
        }

        desiredRpm = calculateRpmFromCurve(temp, curve);
      }

      // Enforce bounds
      const safe = this.safety.evaluateTargetRpm(desiredRpm, fan, this.cachedSensors);
      const target = safe.clampedRpm;

      // Only write to hardware if target has changed (PRD Section 7)
      const prevApplied = this.lastAppliedRpm.get(fan.id);
      if (prevApplied === undefined || Math.abs(prevApplied - target) >= 20) {
        writes.push(
          this.hardware
            .setSpeed(fan.id, target)
            .then(() => {
              this.lastAppliedRpm.set(fan.id, target);
            })
            .catch(() => {
              // If unprivileged, continue monitoring without crashing
            }),
        );
      }
    }

    if (writes.length > 0) {
      await Promise.all(writes);
    }
  }

  public getStatus(): ControllerStatus {
    return {
      state: this.isRunning ? "running" : "stopped",
      pid: process.pid,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      mode: this.config.controller.mode,
      pollIntervalMs: this.config.controller.pollIntervalMs,
      emergencyTemperatureC: this.config.controller.emergencyTempC,
      fans: this.cachedFans,
      sensors: this.cachedSensors,
      lastUpdate: new Date().toISOString(),
      error: this.lastError ?? undefined,
    };
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public async setMode(mode: "auto" | "manual"): Promise<void> {
    this.config.controller.mode = mode;
    saveConfig(this.config);
    if (mode === "auto") {
      await this.hardware.restoreAllAutomatic();
      this.lastAppliedRpm.clear();
    }
    await this.evaluateCycle();
  }

  public async setFanSpeed(fanId: number, rpm: number): Promise<void> {
    const fan = this.cachedFans.find((f) => f.id === fanId);
    const min = fan ? fan.minRpm : 1200;
    const max = fan ? fan.maxRpm : 6000;
    const clamped = Math.max(min, Math.min(max, Math.round(rpm)));

    const fanKey = fanId.toString();
    const existing = this.config.fan[fanKey] ?? {};
    this.config.fan[fanKey] = {
      ...existing,
      targetRpm: clamped,
    };

    saveConfig(this.config);
    await this.hardware.setSpeed(fanId, clamped);
    this.lastAppliedRpm.set(fanId, clamped);
    await this.evaluateCycle();
  }

  public reloadConfig(): void {
    this.config = loadConfig();
    this.safety.setEmergencyThreshold(this.config.controller.emergencyTempC);
  }
}
