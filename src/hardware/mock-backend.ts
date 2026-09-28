import type { HardwareProvider } from "./hardware";
import type { Fan } from "../types/fan";
import type { TemperatureSensor } from "../types/temperature";

export class MockHardwareBackend implements HardwareProvider {
  private fans: Fan[] = [
    {
      id: 0,
      name: "Fan 0",
      currentRpm: 2150,
      minRpm: 1200,
      maxRpm: 6000,
      targetRpm: 2150,
      mode: "auto",
    },
    {
      id: 1,
      name: "Fan 1",
      currentRpm: 2100,
      minRpm: 1200,
      maxRpm: 6000,
      targetRpm: 2100,
      mode: "auto",
    },
  ];

  private sensors: TemperatureSensor[] = [
    {
      id: "cpu.package",
      name: "CPU Package",
      temperature: 55.4,
      unit: "C",
      source: "mock",
      available: true,
    },
    {
      id: "cpu.core0",
      name: "CPU Core 0",
      temperature: 53.1,
      unit: "C",
      source: "mock",
      available: true,
    },
    {
      id: "gpu.core",
      name: "GPU Core",
      temperature: 48.0,
      unit: "C",
      source: "mock",
      available: true,
    },
    {
      id: "battery",
      name: "Battery",
      temperature: 32.5,
      unit: "C",
      source: "mock",
      available: true,
    },
  ];

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async getFans(): Promise<Fan[]> {
    return this.fans.map((f) => ({ ...f }));
  }

  public async getSensors(): Promise<TemperatureSensor[]> {
    return this.sensors.map((s) => ({ ...s }));
  }

  public async setSpeed(fanId: number, rpm: number): Promise<void> {
    const fan = this.fans.find((f) => f.id === fanId);
    if (!fan) throw new Error(`Fan ${fanId} not found`);
    const clamped = Math.max(fan.minRpm, Math.min(fan.maxRpm, Math.round(rpm)));
    fan.targetRpm = clamped;
    fan.currentRpm = clamped;
    fan.mode = "manual";
  }

  public async restoreAutomatic(fanId: number): Promise<void> {
    const fan = this.fans.find((f) => f.id === fanId);
    if (!fan) throw new Error(`Fan ${fanId} not found`);
    fan.mode = "auto";
  }

  public async restoreAllAutomatic(): Promise<void> {
    for (const fan of this.fans) {
      fan.mode = "auto";
    }
  }

  // Testing helpers
  public setMockTemperature(sensorId: string, temp: number): void {
    const s = this.sensors.find((x) => x.id === sensorId);
    if (s) s.temperature = temp;
  }
}
