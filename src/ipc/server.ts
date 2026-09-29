import { chmodSync, existsSync, unlinkSync } from "node:fs";
import { getSocketPath } from "../config/persistence";
import type { FanControllerInstance } from "../controller/controller";
import type { IPCRequest, IPCResponse } from "./protocol";

export interface IPCServerInstance {
  start: () => void;
  stop: () => void;
}

export const createIPCServer = (
  controller: FanControllerInstance,
  socketPath?: string,
): IPCServerInstance => {
  const activeSocketPath = socketPath ?? getSocketPath();
  let server: ReturnType<typeof Bun.listen> | null = null;

  const handleRequest = async (req: IPCRequest): Promise<IPCResponse> => {
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
  };

  const start = (): void => {
    if (existsSync(activeSocketPath)) {
      try {
        unlinkSync(activeSocketPath);
      } catch {
        // ignore
      }
    }

    server = Bun.listen({
      unix: activeSocketPath,
      socket: {
        async data(socket, data) {
          const raw = data.toString().trim();
          if (!raw) return;

          let response: IPCResponse;
          try {
            const req = JSON.parse(raw) as IPCRequest;
            response = await handleRequest(req);
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

    try {
      if (existsSync(activeSocketPath)) {
        chmodSync(activeSocketPath, 0o666);
      }
    } catch {
      // ignore
    }
  };

  const stop = (): void => {
    if (server) {
      server.stop();
      server = null;
    }
    if (existsSync(activeSocketPath)) {
      try {
        unlinkSync(activeSocketPath);
      } catch {
        // ignore
      }
    }
  };

  return {
    start,
    stop,
  };
};

export type IPCServer = IPCServerInstance;
export const IPCServer = createIPCServer;
