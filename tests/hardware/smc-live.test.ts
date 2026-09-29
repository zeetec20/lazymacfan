import { describe, expect, it } from "vitest";
import { createMacOSHardwareBackend, resolveHelperPath } from "../../src/hardware/macos-backend";

describe("Live Hardware Backend (macOS)", () => {
  const backend = createMacOSHardwareBackend();
  const isDarwin = process.platform === "darwin";
  const helperPath = resolveHelperPath();
  const hasHelper = isDarwin && helperPath !== null;
  const isPhysicalMac = hasHelper && !process.env.CI;

  it("checks hardware availability on macOS", async () => {
    const isAvail = await backend.isAvailable();
    expect(typeof isAvail).toBe("boolean");
    expect(isAvail).toBe(hasHelper);
  });

  it.skipIf(!isPhysicalMac)("reads fans on supported Mac hardware", async () => {
    const fans = await backend.getFans();
    expect(Array.isArray(fans)).toBe(true);
    for (const fan of fans) {
      expect(fan.id).toBeGreaterThanOrEqual(0);
      expect(fan.minRpm).toBeGreaterThan(0);
      expect(fan.maxRpm).toBeGreaterThan(fan.minRpm);
    }
  });

  it.skipIf(!isPhysicalMac)("reads temperature sensors on supported Mac hardware", async () => {
    const sensors = await backend.getSensors();
    expect(Array.isArray(sensors)).toBe(true);
    expect(sensors.length).toBeGreaterThan(0);
    const first = sensors[0];
    expect(first?.temperature).toBeGreaterThan(0);
    expect(first?.temperature).toBeLessThan(125);
  });
});
