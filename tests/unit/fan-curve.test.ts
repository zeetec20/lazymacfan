import { describe, expect, it } from "vitest";
import { calculateRpmFromCurve } from "../../src/controller/fan-control";
import type { FanCurvePoint } from "../../src/types/fan";

describe("calculateRpmFromCurve", () => {
  const curve: FanCurvePoint[] = [
    { temperature: 40, rpm: 1500 },
    { temperature: 60, rpm: 3000 },
    { temperature: 80, rpm: 5000 },
  ];

  it("returns exact RPM at curve points", () => {
    expect(calculateRpmFromCurve(40, curve)).toBe(1500);
    expect(calculateRpmFromCurve(60, curve)).toBe(3000);
    expect(calculateRpmFromCurve(80, curve)).toBe(5000);
  });

  it("linearly interpolates between curve points", () => {
    // Halfway between 40°C (1500) and 60°C (3000) is 50°C -> 2250 RPM
    expect(calculateRpmFromCurve(50, curve)).toBe(2250);
    // Halfway between 60°C (3000) and 80°C (5000) is 70°C -> 4000 RPM
    expect(calculateRpmFromCurve(70, curve)).toBe(4000);
  });

  it("clamps to minimum RPM when below lowest point", () => {
    expect(calculateRpmFromCurve(25, curve)).toBe(1500);
    expect(calculateRpmFromCurve(0, curve)).toBe(1500);
  });

  it("clamps to maximum RPM when above highest point", () => {
    expect(calculateRpmFromCurve(90, curve)).toBe(5000);
    expect(calculateRpmFromCurve(105, curve)).toBe(5000);
  });

  it("handles unsorted curve points properly", () => {
    const unsorted: FanCurvePoint[] = [
      { temperature: 80, rpm: 5000 },
      { temperature: 40, rpm: 1500 },
      { temperature: 60, rpm: 3000 },
    ];
    expect(calculateRpmFromCurve(50, unsorted)).toBe(2250);
  });

  it("handles empty curve safely", () => {
    expect(calculateRpmFromCurve(50, [])).toBe(2000);
  });
});
