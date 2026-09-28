import { existsSync, unlinkSync } from "node:fs";
import { getSocketPath } from "../config/persistence";
import type { FanControllerService } from "../controller/controller";
import type { IPCRequest, IPCResponse } from "./protocol";

export class IPCServer {
  private controller: FanControllerService;
  private server: ReturnType<typeof Bun.listen> | null = null;
  private socketPath: string;

  constructor(controller: FanControllerService, socketPath?: string) {
    this.controller = controller;
    this.socketPath = socketPath ?? getSocketPath();
  }

  public start(): void {
    if (existsSync(this.socketPath)) {
      try {
        unlinkSync(this.socketPath);
      } catch {
        // ignore
      }
    }

    const controller = this.controller;

    this.server = Bun.listen({
      unix: this.socketPath,
      socket: {
        async data(socket, data) {
          const raw = data.toString().trim();
          if (!raw) return;

          let response: IPCResponse;
          try {
            const req = JSON.parse(raw) as IPCRequest;
            response = await IPCServer.handleRequest(controller, req);
          } catch (err) {
            response = {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }

          socket.write(JSON.stringify(response) + "\n");
        },
        open() {},
        close() {},
        error(socket, err) {
          const errResp: IPCResponse = { success: false, error: err.message };
          socket.write(JSON.stringify(errResp) + "\n");
        },
      },
    });
  }

  private static async handleRequest(
    controller: FanControllerService,
    req: IPCRequest,
  ): Promise<IPCResponse> {
    switch (req.type) {
      case "ping":
        return { success: true, data: { pong: true } };

      case "get_status":
        return { success: true, data: controller.getStatus() };

      case "get_sensors":
        return { success: true, data: controller.getStatus().sensors };

      case "get_fans":
        return { success: true, data: controller.getStatus().fans };

      case "set_mode":
        await controller.setMode(req.mode);
        return { success: true, data: { mode: req.mode } };

      case "set_fan_speed":
        await controller.setFanSpeed(req.fanId, req.rpm);
        return { success: true, data: { fanId: req.fanId, rpm: req.rpm } };

      case "reload_config":
        controller.reloadConfig();
        return { success: true, data: { reloaded: true } };

      default:
        return { success: false, error: `Unknown request type: ${(req as { type: string }).type}` };
    }
  }

  public stop(): void {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
    if (existsSync(this.socketPath)) {
      try {
        unlinkSync(this.socketPath);
      } catch {
        // ignore
      }
    }
  }
}
