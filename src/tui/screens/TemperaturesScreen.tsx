import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";
import type { ControllerStatus } from "../../types/controller";
import { Gauge } from "../components/Gauge";

export function TemperaturesScreen({
  status,
  selectedIndex,
}: {
  status: ControllerStatus | null;
  selectedIndex: number;
}) {
  const theme = useTheme();

  if (!status || status.sensors.length === 0) {
    return (
      <box
        style={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          borderStyle: "rounded",
          borderColor: theme.accent,
        }}
      >
        <text fg={theme.muted}>No temperature sensors discovered.</text>
      </box>
    );
  }

  const sensors = status.sensors;
  const pageSize = 14;
  const total = sensors.length;
  const start = Math.max(0, Math.min(selectedIndex - Math.floor(pageSize / 2), total - pageSize));
  const visible = sensors.slice(start, start + pageSize);

  // Split into 2 columns for a clean balanced layout
  const half = Math.ceil(visible.length / 2);
  const col1 = visible.slice(0, half);
  const col2 = visible.slice(half);

  return (
    <box
      style={{
        flexGrow: 1,
        flexDirection: "column",
        borderStyle: "rounded",
        borderColor: theme.accent,
        paddingLeft: 2,
        paddingRight: 2,
        paddingTop: 1,
        paddingBottom: 1,
        gap: 1,
      }}
      title={` 🌡️ Temperature Sensors Catalog (${total} discovered) `}
    >
      <box style={{ flexDirection: "row", flexGrow: 1, gap: 2 }}>
        {/* Column 1 */}
        <box style={{ width: "50%", flexDirection: "column", gap: 1 }}>
          {col1.map((s, idx) => {
            const actualIdx = start + idx;
            const isSel = actualIdx === selectedIndex;
            return (
              <box
                key={s.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderStyle: "rounded",
                  borderColor: isSel ? theme.accent : theme.border,
                  backgroundColor: isSel ? theme.selectedBg : undefined,
                  paddingLeft: 1,
                  paddingRight: 1,
                }}
              >
                <box style={{ flexDirection: "column" }}>
                  <text
                    fg={isSel ? theme.accent : theme.fg}
                    attributes={isSel ? TextAttributes.BOLD : undefined}
                  >
                    {isSel ? "▶ " : "  "}
                    {s.name.length > 22 ? s.name.slice(0, 20) + ".." : s.name}
                  </text>
                  <text fg={theme.muted}>
                    <span>[{s.source.toUpperCase()}]</span>
                  </text>
                </box>

                <box style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
                  <Gauge
                    value={s.temperature}
                    min={25}
                    max={100}
                    width={10}
                    isTemperature
                    showPercentage={false}
                  />
                  <text fg={theme.fg} attributes={TextAttributes.BOLD}>
                    {s.temperature.toFixed(1)}°C
                  </text>
                </box>
              </box>
            );
          })}
        </box>

        {/* Column 2 */}
        <box style={{ width: "50%", flexDirection: "column", gap: 1 }}>
          {col2.map((s, idx) => {
            const actualIdx = start + half + idx;
            const isSel = actualIdx === selectedIndex;
            return (
              <box
                key={s.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderStyle: "rounded",
                  borderColor: isSel ? theme.accent : theme.border,
                  backgroundColor: isSel ? theme.selectedBg : undefined,
                  paddingLeft: 1,
                  paddingRight: 1,
                }}
              >
                <box style={{ flexDirection: "column" }}>
                  <text
                    fg={isSel ? theme.accent : theme.fg}
                    attributes={isSel ? TextAttributes.BOLD : undefined}
                  >
                    {isSel ? "▶ " : "  "}
                    {s.name.length > 22 ? s.name.slice(0, 20) + ".." : s.name}
                  </text>
                  <text fg={theme.muted}>
                    <span>[{s.source.toUpperCase()}]</span>
                  </text>
                </box>

                <box style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
                  <Gauge
                    value={s.temperature}
                    min={25}
                    max={100}
                    width={10}
                    isTemperature
                    showPercentage={false}
                  />
                  <text fg={theme.fg} attributes={TextAttributes.BOLD}>
                    {s.temperature.toFixed(1)}°C
                  </text>
                </box>
              </box>
            );
          })}
        </box>
      </box>

      {/* Pagination Footer */}
      <box
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          borderStyle: "rounded",
          borderColor: theme.border,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        <text fg={theme.muted}>
          <span>Showing sensors </span>
          <span fg={theme.accent} attributes={TextAttributes.BOLD}>
            {start + 1} - {Math.min(start + pageSize, total)}
          </span>
          <span> of {total}</span>
        </text>
        <text fg={theme.muted}>Use [↑ / ↓] to navigate list</text>
      </box>
    </box>
  );
}
