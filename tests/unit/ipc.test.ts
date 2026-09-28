import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { IPCServer } from "../../src/ipc/server";
import { IPCClient } from "../../src/ipc/client";
import { FanControllerService } from "../../src/controller/controller";
import { MockHardwareBackend } from "../../src/hardware/mock-backend";

describe("IPC Server & Client", () => {
  const testSocket = join(tmpdir(), `lazymacfan-test-${Date.now()}.sock`);
  let mockHardware: MockHardwareBackend;
  let controller: FanControllerService;
  let server: IPCServer;
  let client: IPCClient;

  beforeAll(async () => {
    mockHardware = new MockHardwareBackend();
    controller = new FanControllerService(mockHardware);
    await controller.start();
    server = new IPCServer(controller, testSocket);
    server.start();
    client = new IPCClient(testSocket);
  });

  afterAll(async () => {
    server.stop();
    await controller.stop();
  });

  it("checks agent is running via ping", async () => {
    const isRunning = await client.isAgentRunning();
    expect(isRunning).toBe(true);
  });

  it("queries controller status", async () => {
    const status = await client.getStatus();
    expect(status.state).toBe("running");
    expect(status.fans.length).toBeGreaterThan(0);
    expect(status.sensors.length).toBeGreaterThan(0);
  });

  it("queries fans list", async () => {
    const fans = await client.getFans();
    expect(fans.length).toBe(2);
    expect(fans[0]?.name).toBe("Fan 0");
  });

  it("queries sensors list", async () => {
    const sensors = await client.getSensors();
    expect(sensors.length).toBe(4);
    expect(sensors[0]?.id).toBe("cpu.package");
  });

  it("switches controller mode", async () => {
    await client.setMode("manual");
    let status = await client.getStatus();
    expect(status.mode).toBe("manual");

    await client.setMode("auto");
    status = await client.getStatus();
    expect(status.mode).toBe("auto");
  });

  it("sets fan speed", async () => {
    await client.setFanSpeed(0, 3500);
    const fans = await client.getFans();
    const fan0 = fans.find((f) => f.id === 0);
    expect(fan0?.targetRpm).toBe(3500);
  });
});
