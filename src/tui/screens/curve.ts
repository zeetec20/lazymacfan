import type { ControllerStatus } from "../../types/controller";
import { DEFAULT_FAN_CURVE } from "../../config/config";
import type { FanCurvePoint } from "../../types/fan";

export function renderCurve(
  _status: ControllerStatus | null,
  curve: FanCurvePoint[] = DEFAULT_FAN_CURVE,
): string {
  const lines: string[] = [];
  lines.push("┌─ Automatic Fan Curve ────────────────────────────────────┐");
  lines.push("│                                                          │");
  lines.push("│  Temperature Source: CPU Package / Highest Die Sensor    │");
  lines.push("│  ─────────────────────────────────────────────────────   │");
  lines.push("│  RPM                                                     │");
  lines.push("│  6000 |                         *                        │");
  lines.push("│  5000 |                     *                            │");
  lines.push("│  4000 |                 *                                │");
  lines.push("│  3000 |             *                                    │");
  lines.push("│  2000 |     *   *                                        │");
  lines.push("│  1000 |                                                  │");
  lines.push("│       +---------------------------------------------     │");
  lines.push("│         40  50  60  70  80  90 °C                        │");
  lines.push("│                                                          │");
  lines.push("│  Configured Threshold Points:                            │");

  for (const pt of curve) {
    lines.push(
      `│    ${pt.temperature.toString().padStart(2)}°C  →  ${pt.rpm.toString().padStart(5)} RPM                              │`,
    );
  }

  lines.push("│                                                          │");
  lines.push("│  [d] Dashboard  [f] Fans  [s] Settings  [q] Quit         │");
  lines.push("└──────────────────────────────────────────────────────────┘");

  return lines.join("\n");
}
