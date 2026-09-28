import type { ControllerStatus } from "../types/controller";
import type { Fan, FanCurvePoint, FanMode } from "../types/fan";
import type { TemperatureSensor } from "../types/temperature";

export type IPCRequest =
  | { type: "get_status" }
  | { type: "get_sensors" }
  | { type: "get_fans" }
  | { type: "set_fan_speed"; fanId: number; rpm: number }
  | { type: "set_mode"; mode: FanMode }
  | { type: "set_curve"; fanId: number; curve: FanCurvePoint[] }
  | { type: "reload_config" }
  | { type: "ping" };

export type IPCResponse =
  | { success: true; data: ControllerStatus }
  | { success: true; data: TemperatureSensor[] }
  | { success: true; data: Fan[] }
  | { success: true; data: { fanId: number; rpm: number } }
  | { success: true; data: { mode: FanMode } }
  | { success: true; data: { reloaded: boolean } }
  | { success: true; data: { pong: boolean } }
  | { success: false; error: string };
