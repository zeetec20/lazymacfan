import type { ControllerStatus } from "../../types/controller";

export function renderTemperatures(status: ControllerStatus | null, selectedIndex = 0): string {
  const lines: string[] = [];
  lines.push("┌─ Temperature Sensors ────────────────────────────────────┐");

  if (!status || status.sensors.length === 0) {
    lines.push("│  No temperature sensors available.                       │");
    lines.push("│  [d] Dashboard  [q] Quit                                 │");
    lines.push("└──────────────────────────────────────────────────────────┘");
    return lines.join("\n");
  }

  lines.push("│  SENSOR NAME                     TEMP         STATUS     │");
  lines.push("│  ─────────────────────────────────────────────────────   │");

  // Show up to 14 sensors in viewport with scrolling
  const pageSize = 14;
  const total = status.sensors.length;
  const start = Math.max(0, Math.min(selectedIndex - Math.floor(pageSize / 2), total - pageSize));
  const end = Math.min(start + pageSize, total);

  for (let i = start; i < end; i++) {
    const s = status.sensors[i];
    if (!s) continue;
    const isSelected = i === selectedIndex;
    const prefix = isSelected ? "> " : "  ";
    const name = s.name.length > 28 ? s.name.slice(0, 26) + ".." : s.name;
    const tempStr = s.available ? `${s.temperature.toFixed(1)}°C` : "N/A";
    const statusStr = s.available ? "OK" : (s.status ?? "Offline");

    const row = `${prefix}${name.padEnd(30)} ${tempStr.padEnd(12)} ${statusStr}`;
    lines.push(`│ ${row.padEnd(57)}│`);
  }

  lines.push("│                                                          │");
  lines.push(`│  Showing ${start + 1}-${end} of ${total} sensors                    │`);
  lines.push("│  [↑/↓] Scroll  [d] Dashboard  [f] Fans  [q] Quit         │");
  lines.push("└──────────────────────────────────────────────────────────┘");

  return lines.join("\n");
}
