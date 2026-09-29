import type { Fan } from "../types/fan";
import type { TemperatureSensor } from "../types/temperature";

export interface TemperatureProvider {
  getSensors(): Promise<TemperatureSensor[]>;
}

export interface FanController {
  getFans(): Promise<Fan[]>;
  setSpeed(fanId: number, rpm: number): Promise<void>;
  restoreAutomatic(fanId: number): Promise<void>;
  restoreAllAutomatic(): Promise<void>;
}

export interface HardwareProvider extends TemperatureProvider, FanController {
  isAvailable(): Promise<boolean>;
  checkPrivileges?(): Promise<{ privileged: boolean; euid?: number; uid?: number }>;
}
