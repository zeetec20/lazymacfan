import type { FanCurvePoint } from "../types/fan";

/**
 * Calculates target RPM for a given temperature using linear interpolation
 * along the configured fan curve points.
 */
export function calculateRpmFromCurve(temperature: number, curve: FanCurvePoint[]): number {
  if (curve.length === 0) {
    return 2000;
  }

  // Sort curve by ascending temperature
  const sorted = [...curve].sort((a, b) => a.temperature - b.temperature);

  // If temperature is below lowest point, use lowest RPM
  const first = sorted[0];
  if (!first || temperature <= first.temperature) {
    return first ? first.rpm : 2000;
  }

  // If temperature is above highest point, use highest RPM
  const last = sorted[sorted.length - 1];
  if (!last || temperature >= last.temperature) {
    return last ? last.rpm : 5500;
  }

  // Find surrounding interval and linearly interpolate
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];

    if (p1 && p2 && temperature >= p1.temperature && temperature <= p2.temperature) {
      const tempDiff = p2.temperature - p1.temperature;
      if (tempDiff === 0) return p1.rpm;

      const factor = (temperature - p1.temperature) / tempDiff;
      const rpm = p1.rpm + factor * (p2.rpm - p1.rpm);
      return Math.round(rpm);
    }
  }

  return last.rpm;
}
