import type { ControllerStatus } from "../../types/controller";

export function renderFans(status: ControllerStatus | null, selectedFanIndex = 0): string {
  const lines: string[] = [];
  lines.push("┌─ Fan Control ────────────────────────────────────────────┐");

  if (!status || status.fans.length === 0) {
    lines.push("│  No controllable fans found on this system.              │");
    lines.push("│  [d] Dashboard  [q] Quit                                 │");
    lines.push("└──────────────────────────────────────────────────────────┘");
    return lines.join("\n");
  }

  const fan = status.fans[selectedFanIndex] ?? status.fans[0];
  if (!fan) return "";

  lines.push(
    `│  Selected Fan: ${fan.name} (Fan ${selectedFanIndex + 1} of ${status.fans.length})                │`,
  );
  lines.push("│  ─────────────────────────────────────────────────────   │");
  lines.push(
    `│  Current Speed                          ${Math.round(fan.currentRpm).toString().padStart(5)} RPM       │`,
  );
  lines.push(
    `│  Target Speed                           ${Math.round(fan.targetRpm).toString().padStart(5)} RPM       │`,
  );
  lines.push(
    `│  Minimum Speed                          ${Math.round(fan.minRpm).toString().padStart(5)} RPM       │`,
  );
  lines.push(
    `│  Maximum Speed                          ${Math.round(fan.maxRpm).toString().padStart(5)} RPM       │`,
  );
  lines.push("│                                                          │");

  // Speed bar visual
  const percentage = Math.max(
    0,
    Math.min(1, (fan.currentRpm - fan.minRpm) / (fan.maxRpm - fan.minRpm || 1)),
  );
  const barWidth = 36;
  const filled = Math.round(percentage * barWidth);
  const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);
  lines.push(`│  RPM Gauge: [${bar}] ${Math.round(percentage * 100)}%   │`);
  lines.push("│                                                          │");

  lines.push("│  Active Mode:                                            │");
  if (fan.mode === "manual") {
    lines.push("│  > [●] Manual Mode (User configured RPM)                 │");
    lines.push("│    [ ] Automatic Mode (Dynamic temperature curve)        │");
  } else {
    lines.push("│    [ ] Manual Mode (User configured RPM)                 │");
    lines.push("│  > [●] Automatic Mode (Dynamic temperature curve)        │");
  }

  lines.push("│                                                          │");
  lines.push("│  Controls:                                               │");
  lines.push("│  [←/→] Adjust Target RPM (±100)                          │");
  lines.push("│  [m] Toggle Mode (Manual / Auto)                         │");
  lines.push("│  [Tab / ↑ / ↓] Switch Fan                                │");
  lines.push("│  [d] Dashboard  [t] Temperatures  [c] Curve  [q] Quit    │");
  lines.push("└──────────────────────────────────────────────────────────┘");

  return lines.join("\n");
}
