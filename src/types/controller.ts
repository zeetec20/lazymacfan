import type { Fan, FanMode } from "./fan";
import type { TemperatureSensor } from "./temperature";

export type ControllerState = "idle" | "running" | "error" | "stopped";

export interface ControllerStatus {
  state: ControllerState;
  pid: number;
  uptimeSeconds: number;
  mode: FanMode;
  pollIntervalMs: number;
  emergencyTemperatureC: number;
  fans: Fan[];
  sensors: TemperatureSensor[];
  lastUpdate: string;
  error?: string;
  privileged?: boolean;
  lidClosed?: boolean;
}
