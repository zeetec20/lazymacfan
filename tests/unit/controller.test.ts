import { describe, expect, it, afterEach } from "vitest";
import { FanControllerService } from "../../src/controller/controller";
import { MockHardwareBackend } from "../../src/hardware/mock-backend";
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
    const mock = new MockHardwareBackend();
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

    controller = new FanControllerService(mock, testConfig);
    await controller.evaluateCycle();

    const fans = await mock.getFans();
    const fan0 = fans.find((f) => f.id === 0);
    expect(fan0?.targetRpm).toBe(3200);
  });

  it("triggers emergency max RPM when sensor exceeds emergency threshold", async () => {
    const mock = new MockHardwareBackend();
    mock.setMockTemperature("cpu.package", 98); // Exceeds 95°C

    controller = new FanControllerService(mock);
    await controller.evaluateCycle();

    const fans = await mock.getFans();
    const fan0 = fans.find((f) => f.id === 0);
    expect(fan0?.targetRpm).toBe(fan0?.maxRpm);
  });

  it("restores automatic mode upon service stop", async () => {
    const mock = new MockHardwareBackend();
    controller = new FanControllerService(mock);
    await controller.start();

    await controller.setFanSpeed(0, 4000);
    let fans = await mock.getFans();
    expect(fans.find((f) => f.id === 0)?.mode).toBe("manual");

    await controller.stop();
    fans = await mock.getFans();
    expect(fans.find((f) => f.id === 0)?.mode).toBe("auto");
  });
});
