import { describe, expect, it, afterEach } from "vitest";
import { createFanController, type FanControllerService } from "../../src/controller/controller";
import { createMockHardwareBackend } from "../../src/hardware/mock-backend";
import type { AppConfig } from "../../src/config/config";

describe("FanControllerService", () => {
  let controller: FanControllerService | null = null;

  afterEach(async () => {
    if (controller) {
      await controller.stop();
      controller = null;
    }
  });

  it("evaluates cycle and sets fan speed based on curve in auto mode", async () => {
    const mock = createMockHardwareBackend();
    mock.setMockTemperature("cpu.package", 60);

    const testConfig: AppConfig = {
      controller: {
        mode: "auto",
        pollIntervalMs: 1000,
        emergencyTempC: 95,
        tempUnit: "C",
      },
      fan: {
        "0": {
          automatic: {
            sensor: "cpu.package",
            curve: [
              { temperature: 40, rpm: 2000 },
              { temperature: 60, rpm: 3200 },
              { temperature: 80, rpm: 5000 },
            ],
          },
        },
      },
    };

    controller = createFanController(mock, testConfig);
    await controller.evaluateCycle();

    const fans = await mock.getFans();
    const fan0 = fans.find((f) => f.id === 0);
    expect(fan0?.targetRpm).toBe(3200);
  });

  it("triggers emergency max RPM when sensor exceeds emergency threshold", async () => {
    const mock = createMockHardwareBackend();
    mock.setMockTemperature("cpu.package", 98); // Exceeds 95°C

    controller = createFanController(mock);
    await controller.evaluateCycle();

    const fans = await mock.getFans();
    const fan0 = fans.find((f) => f.id === 0);
    expect(fan0?.targetRpm).toBe(fan0?.maxRpm);
  });

  it("restores automatic mode upon service stop", async () => {
    const mock = createMockHardwareBackend();
    controller = createFanController(mock);
    await controller.start();

    await controller.setFanSpeed(0, 4000);
    let fans = await mock.getFans();
    expect(fans.find((f) => f.id === 0)?.mode).toBe("manual");

    await controller.stop();
    fans = await mock.getFans();
    expect(fans.find((f) => f.id === 0)?.mode).toBe("auto");
  });

  it("automatically switches to auto mode and restores OS control when screen/lid is closed", async () => {
    const mock = createMockHardwareBackend();
    const testConfig: AppConfig = {
      controller: {
        mode: "manual",
        pollIntervalMs: 1000,
        emergencyTempC: 95,
        tempUnit: "C",
      },
      fan: {
        "0": {
          targetRpm: 4500,
        },
      },
    };

    controller = createFanController(mock, testConfig);
    // Initially open
    mock.setMockLidClosed(false);
    await controller.evaluateCycle();
    expect(controller.getStatus().mode).toBe("manual");
    expect(controller.getStatus().lidClosed).toBe(false);

    // Screen/lid is closed
    mock.setMockLidClosed(true);
    await controller.evaluateCycle();

    // Mode is automatically reverted to auto and OS automatic control restored
    expect(controller.getStatus().mode).toBe("auto");
    expect(controller.getStatus().lidClosed).toBe(true);
    const fans = await mock.getFans();
    expect(fans.every((f) => f.mode === "auto")).toBe(true);

    // Reopen lid
    mock.setMockLidClosed(false);
    await controller.evaluateCycle();
    expect(controller.getStatus().lidClosed).toBe(false);
    expect(controller.getStatus().mode).toBe("auto");
  });
});
