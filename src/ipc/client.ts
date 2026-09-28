import { createConnection } from "node:net";
import { existsSync } from "node:fs";
import { getSocketPath } from "../config/persistence";
import type { IPCRequest } from "./protocol";
import type { ControllerStatus } from "../types/controller";
import type { Fan, FanMode } from "../types/fan";
import type { TemperatureSensor } from "../types/temperature";

export class IPCClient {
  private socketPath: string;

  constructor(socketPath?: string) {
    this.socketPath = socketPath ?? getSocketPath();
  }

  public async isAgentRunning(): Promise<boolean> {
    if (!existsSync(this.socketPath)) return false;
    try {
      const resp = await this.send({ type: "ping" }, 500);
      return resp.success;
    } catch {
      return false;
    }
  }

  public send<T>(
    request: IPCRequest,
    timeoutMs = 2000,
  ): Promise<{ success: true; data: T } | { success: false; error: string }> {
    return new Promise((resolve, reject) => {
      if (!existsSync(this.socketPath)) {
        reject(
          new Error(
            "Controller is not running.\nStart it with:\n  lazymacfan agent\nor via service:\n  lazymacfan service start",
          ),
        );
        return;
      }

      const client = createConnection(this.socketPath);
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
            `Unable to connect to controller at ${this.socketPath}: ${err.message}\n` +
              "Start the agent with: lazymacfan agent",
          ),
        );
      });
    });
  }

  public async getStatus(): Promise<ControllerStatus> {
    const res = await this.send<ControllerStatus>({ type: "get_status" });
    if (!res.success) throw new Error(res.error);
    return res.data;
  }

  public async getFans(): Promise<Fan[]> {
    const res = await this.send<Fan[]>({ type: "get_fans" });
    if (!res.success) throw new Error(res.error);
    return res.data;
  }

  public async getSensors(): Promise<TemperatureSensor[]> {
    const res = await this.send<TemperatureSensor[]>({ type: "get_sensors" });
    if (!res.success) throw new Error(res.error);
    return res.data;
  }

  public async setMode(mode: FanMode): Promise<void> {
    const res = await this.send<{ mode: FanMode }>({
      type: "set_mode",
      mode,
    });
    if (!res.success) throw new Error(res.error);
  }

  public async setFanSpeed(fanId: number, rpm: number): Promise<void> {
    const res = await this.send<{ fanId: number; rpm: number }>({
      type: "set_fan_speed",
      fanId,
      rpm,
    });
    if (!res.success) throw new Error(res.error);
  }

  public async reloadConfig(): Promise<void> {
    const res = await this.send<{ reloaded: boolean }>({
      type: "reload_config",
    });
    if (!res.success) throw new Error(res.error);
  }
}
