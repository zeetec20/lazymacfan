import { describe, expect, it } from "vitest";
import { createMockHardwareBackend } from "../../src/hardware/mock-backend";
import { createMacOSHardwareBackend } from "../../src/hardware/macos-backend";
import { createFanController } from "../../src/controller/controller";
import { resolveActiveSocketPath, getSocketPath } from "../../src/config/persistence";

describe("Privilege & Permission Handling", () => {
  it("reports privileged true on MockHardwareBackend", async () => {
    const mock = createMockHardwareBackend();
    const priv = await mock.checkPrivileges();
    expect(priv.privileged).toBe(true);
  });

  it.skipIf(process.platform !== "darwin")(
    "checks privileges on MacOSHardwareBackend",
    async () => {
      const backend = createMacOSHardwareBackend();
      const priv = await backend.checkPrivileges();
      expect(typeof priv.privileged).toBe("boolean");
    },
  );

  it("propagates privileged status to ControllerStatus", async () => {
    const mock = createMockHardwareBackend();
    const controller = createFanController(mock);
    await controller.start();

    const status = controller.getStatus();
    expect(status.privileged).toBe(true);
    await controller.stop();
  });

  it("resolves socket paths correctly", () => {
    const socketPath = getSocketPath();
    expect(typeof socketPath).toBe("string");
    expect(socketPath.endsWith(".sock")).toBe(true);

    const activeSocket = resolveActiveSocketPath();
    expect(typeof activeSocket).toBe("string");
    expect(activeSocket.endsWith(".sock")).toBe(true);
  });
});
