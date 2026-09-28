import { describe, expect, it } from "vitest";
import { SafetyGuardian } from "../../src/controller/safety";
import type { Fan } from "../../src/types/fan";
import type { TemperatureSensor } from "../../src/types/temperature";

describe("SafetyGuardian", () => {
  const fan: Fan = {
    id: 0,
    name: "Fan 0",
    currentRpm: 2500,
    minRpm: 1200,
    maxRpm: 6000,
    targetRpm: 2500,
    mode: "manual",
  };

  it("clamps RPM within min and max boundaries", () => {
    const guardian = new SafetyGuardian(95);

    expect(guardian.clampRpm(500, fan)).toBe(1200);
    expect(guardian.clampRpm(3000, fan)).toBe(3000);
    expect(guardian.clampRpm(7000, fan)).toBe(6000);
    expect(guardian.clampRpm(NaN, fan)).toBe(1200);
  });

  it("detects when emergency temperature is breached", () => {
    const guardian = new SafetyGuardian(95);
    const normalSensors: TemperatureSensor[] = [
      { id: "cpu", name: "CPU", temperature: 65, unit: "C", source: "mock", available: true },
      { id: "gpu", name: "GPU", temperature: 50, unit: "C", source: "mock", available: true },
    ];

    expect(guardian.checkEmergencyTemperature(normalSensors).emergency).toBe(false);

    const hotSensors: TemperatureSensor[] = [
      { id: "cpu", name: "CPU", temperature: 96.5, unit: "C", source: "mock", available: true },
    ];
    const check = guardian.checkEmergencyTemperature(hotSensors);
    expect(check.emergency).toBe(true);
    expect(check.sensor?.id).toBe("cpu");
  });

  it("forces maximum RPM during emergency temperature override", () => {
    const guardian = new SafetyGuardian(95);
    const hotSensors: TemperatureSensor[] = [
      {
        id: "cpu",
        name: "CPU Package",
        temperature: 98,
        unit: "C",
        source: "mock",
        available: true,
      },
    ];

    const result = guardian.evaluateTargetRpm(2000, fan, hotSensors);
    expect(result.isEmergency).toBe(true);
    expect(result.clampedRpm).toBe(fan.maxRpm);
  });

  it("ignores unavailable or offline sensors for emergency check", () => {
    const guardian = new SafetyGuardian(95);
    const unavailableSensors: TemperatureSensor[] = [
      { id: "cpu", name: "CPU", temperature: 105, unit: "C", source: "mock", available: false },
    ];

    const check = guardian.checkEmergencyTemperature(unavailableSensors);
    expect(check.emergency).toBe(false);
  });
});
