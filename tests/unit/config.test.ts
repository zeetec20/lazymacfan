import { describe, expect, it } from "vitest";
import { parse, stringify } from "smol-toml";
import { DEFAULT_CONFIG, type AppConfig } from "../../src/config/config";

describe("Configuration", () => {
  it("has valid default config structure", () => {
    expect(DEFAULT_CONFIG.controller.mode).toBe("auto");
    expect(DEFAULT_CONFIG.controller.pollIntervalMs).toBe(1000);
    expect(DEFAULT_CONFIG.controller.emergencyTempC).toBe(95);
    expect(DEFAULT_CONFIG.fan["0"]).toBeDefined();
  });

  it("serializes and deserializes to TOML correctly", () => {
    const customConfig: AppConfig = {
      controller: {
        mode: "manual",
        pollIntervalMs: 2000,
        emergencyTempC: 90,
        tempUnit: "C",
      },
      fan: {
        "0": {
          targetRpm: 3200,
          automatic: {
            sensor: "cpu.package",
            curve: [
              { temperature: 45, rpm: 1800 },
              { temperature: 75, rpm: 4500 },
            ],
          },
        },
      },
    };

    const tomlString = stringify(customConfig as unknown as Record<string, unknown>);
    expect(tomlString).toContain('mode = "manual"');
    expect(tomlString).toContain("emergencyTempC = 90");

    const parsed = parse(tomlString) as unknown as AppConfig;
    expect(parsed.controller.mode).toBe("manual");
    expect(parsed.controller.pollIntervalMs).toBe(2000);
    expect(parsed.fan["0"]?.targetRpm).toBe(3200);
  });

  it("expands leading ~ properly", async () => {
    const { expandHome } = await import("../../src/config/persistence");
    const { homedir } = await import("node:os");
    const { join } = await import("node:path");

    expect(expandHome("~")).toBe(homedir());
    expect(expandHome("~/test/path")).toBe(join(homedir(), "test/path"));
    expect(expandHome("/absolute/path")).toBe("/absolute/path");
  });

  it("resolves CONFIG_DIR and CONFIG_FILE under .config", async () => {
    const { CONFIG_DIR, CONFIG_FILE, getConfigPath } = await import("../../src/config/persistence");
    const { join } = await import("node:path");

    expect(CONFIG_DIR).toContain("lazymacfan");
    expect(CONFIG_FILE).toBe(join(CONFIG_DIR, "config.toml"));
    expect(getConfigPath()).toBe(CONFIG_FILE);
  });
});
