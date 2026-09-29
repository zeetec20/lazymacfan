import type { HardwareProvider } from "./hardware";
import type { Fan } from "../types/fan";
import type { TemperatureSensor } from "../types/temperature";

export interface MockHardwareBackendInstance extends HardwareProvider {
  checkPrivileges: () => Promise<{ privileged: boolean; euid?: number; uid?: number }>;
  setMockTemperature: (sensorId: string, temp: number) => void;
}

export const createMockHardwareBackend = (): MockHardwareBackendInstance => {
  const fans: Fan[] = [
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

  const sensors: TemperatureSensor[] = [
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

  const isAvailable = async (): Promise<boolean> => true;

  const checkPrivileges = async (): Promise<{ privileged: boolean }> => ({ privileged: true });

  const getFans = async (): Promise<Fan[]> => fans.map((f) => ({ ...f }));

  const getSensors = async (): Promise<TemperatureSensor[]> => sensors.map((s) => ({ ...s }));

  const setSpeed = async (fanId: number, rpm: number): Promise<void> => {
    const fan = fans.find((f) => f.id === fanId);
    if (!fan) throw new Error(`Fan ${fanId} not found`);
    const clamped = Math.max(fan.minRpm, Math.min(fan.maxRpm, Math.round(rpm)));
    fan.targetRpm = clamped;
    fan.currentRpm = clamped;
    fan.mode = "manual";
  };

  const restoreAutomatic = async (fanId: number): Promise<void> => {
    const fan = fans.find((f) => f.id === fanId);
    if (!fan) throw new Error(`Fan ${fanId} not found`);
    fan.mode = "auto";
  };

  const restoreAllAutomatic = async (): Promise<void> => {
    for (const fan of fans) {
      fan.mode = "auto";
    }
  };

  const setMockTemperature = (sensorId: string, temp: number): void => {
    const s = sensors.find((x) => x.id === sensorId);
    if (s) s.temperature = temp;
  };

  return {
    isAvailable,
    checkPrivileges,
    getFans,
    getSensors,
    setSpeed,
    restoreAutomatic,
    restoreAllAutomatic,
    setMockTemperature,
  };
};

export type MockHardwareBackend = MockHardwareBackendInstance;
export const MockHardwareBackend = createMockHardwareBackend;
