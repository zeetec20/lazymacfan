import type { FanCurvePoint, FanMode } from "../types/fan";
import type { TemperatureUnit } from "../types/temperature";

export interface FanConfig {
  targetRpm?: number;
  minRpm?: number;
  maxRpm?: number;
  automatic?: {
    sensor?: string;
    curve?: FanCurvePoint[];
  };
}

export interface ControllerConfig {
  mode: FanMode;
  pollIntervalMs: number;
  emergencyTempC: number;
  tempUnit: TemperatureUnit;
}

export interface AppConfig {
  controller: ControllerConfig;
  fan: Record<string, FanConfig>;
}

export const DEFAULT_FAN_CURVE: FanCurvePoint[] = [
  { temperature: 45, rpm: 1800 },
  { temperature: 55, rpm: 2500 },
  { temperature: 65, rpm: 3500 },
  { temperature: 75, rpm: 4500 },
  { temperature: 85, rpm: 5500 },
];

export const DEFAULT_CONFIG: AppConfig = {
  controller: {
    mode: "auto",
    pollIntervalMs: 1000,
    emergencyTempC: 95,
    tempUnit: "C",
  },
  fan: {
    "0": {
      targetRpm: 2500,
      automatic: {
        sensor: "auto",
        curve: DEFAULT_FAN_CURVE,
      },
    },
  },
};
