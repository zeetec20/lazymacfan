import { createConnection } from "node:net";
import { existsSync } from "node:fs";
import { resolveActiveSocketPath } from "../config/persistence";
import type { IPCRequest } from "./protocol";
import type { ControllerStatus } from "../types/controller";
import type { Fan, FanMode } from "../types/fan";
import type { TemperatureSensor } from "../types/temperature";

export interface IPCClientInstance {
  readonly socketPath: string;
  isAgentRunning: () => Promise<boolean>;
  send: <T>(
    request: IPCRequest,
    timeoutMs?: number,
  ) => Promise<{ success: true; data: T } | { success: false; error: string }>;
  getStatus: () => Promise<ControllerStatus>;
  getFans: () => Promise<Fan[]>;
  getSensors: () => Promise<TemperatureSensor[]>;
  setMode: (mode: FanMode) => Promise<void>;
  setFanSpeed: (fanId: number, rpm: number) => Promise<void>;
  reloadConfig: () => Promise<void>;
}

export const createIPCClient = (socketPath?: string): IPCClientInstance => {
  const getSocket = (): string => socketPath ?? resolveActiveSocketPath();

  const send = <T>(
    request: IPCRequest,
    timeoutMs = 2000,
  ): Promise<{ success: true; data: T } | { success: false; error: string }> =>
    new Promise((resolve, reject) => {
      const sock = getSocket();
      if (!existsSync(sock)) {
        reject(
          new Error(
            "Controller is not running.\nStart it with:\n  lazymacfan agent\nor via service:\n  lazymacfan service start",
          ),
        );
        return;
      }

      const client = createConnection(sock);
      let buffer = "";
      let timer: ReturnType<typeof setTimeout>;

      timer = setTimeout(() => {
        client.destroy();
        reject(new Error("IPC request timed out. Controller might be busy or hanging."));
      }, timeoutMs);

      client.on("connect", () => {
        client.write(JSON.stringify(request) + "\n");
      });

      client.on("data", (data) => {
        buffer += data.toString();
        if (buffer.includes("\n")) {
          clearTimeout(timer);
          client.end();
          try {
            const parsed = JSON.parse(buffer.trim()) as
              | { success: true; data: T }
              | { success: false; error: string };
            resolve(parsed);
          } catch (err) {
            reject(new Error(`Failed to parse IPC response: ${String(err)}`));
          }
        }
      });

      client.on("error", (err) => {
        clearTimeout(timer);
        reject(
          new Error(
            `Unable to connect to controller at ${sock}: ${err.message}\n` +
              "Start the agent with: lazymacfan agent",
          ),
        );
      });
    });

  const isAgentRunning = async (): Promise<boolean> => {
    const sock = getSocket();
    if (!existsSync(sock)) return false;
    try {
      const resp = await send({ type: "ping" }, 500);
      return resp.success;
    } catch {
      return false;
    }
  };

  const getStatus = async (): Promise<ControllerStatus> => {
    const res = await send<ControllerStatus>({ type: "get_status" });
    if (!res.success) throw new Error(res.error);
    return res.data;
  };

  const getFans = async (): Promise<Fan[]> => {
    const res = await send<Fan[]>({ type: "get_fans" });
    if (!res.success) throw new Error(res.error);
    return res.data;
  };

  const getSensors = async (): Promise<TemperatureSensor[]> => {
    const res = await send<TemperatureSensor[]>({ type: "get_sensors" });
    if (!res.success) throw new Error(res.error);
    return res.data;
  };

  const setMode = async (mode: FanMode): Promise<void> => {
    const res = await send<{ mode: FanMode }>({
      type: "set_mode",
      mode,
    });
    if (!res.success) throw new Error(res.error);
  };

  const setFanSpeed = async (fanId: number, rpm: number): Promise<void> => {
    const res = await send<{ fanId: number; rpm: number }>({
      type: "set_fan_speed",
      fanId,
      rpm,
    });
    if (!res.success) throw new Error(res.error);
  };

  const reloadConfig = async (): Promise<void> => {
    const res = await send<{ reloaded: boolean }>({
      type: "reload_config",
    });
    if (!res.success) throw new Error(res.error);
  };

  return {
    get socketPath() {
      return getSocket();
    },
    isAgentRunning,
    send,
    getStatus,
    getFans,
    getSensors,
    setMode,
    setFanSpeed,
    reloadConfig,
  };
};

export type IPCClient = IPCClientInstance;
export const IPCClient = createIPCClient;
