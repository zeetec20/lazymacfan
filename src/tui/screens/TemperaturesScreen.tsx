import { useRef } from "react";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../ThemeContext";
import type { ControllerStatus } from "../../types/controller";
import { Gauge } from "../components/Gauge";
import { getThinScrollbarOptions } from "../scrollbar";

const getSensorIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (/cpu|tdie|cluster|core|p-core|e-core/i.test(lower)) return "⚡";
  if (/gpu/i.test(lower)) return "🎮";
  if (/bat|gauge/i.test(lower)) return "🔋";
  if (/nand|ssd|storage/i.test(lower)) return "💾";
  if (/pmu|pwr|charger|adapter/i.test(lower)) return "🔌";
  if (/ambient|airflow|heatsink/i.test(lower)) return "🌡️";
  return "🌡️";
};

export const TemperaturesScreen = ({ status }: { status: ControllerStatus | null }) => {
  const theme = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollRef = useRef<any>(null);

  useKeyboard((key) => {
    const name = key.name.toLowerCase();
    if (name === "up" || name === "k") {
      scrollRef.current?.scrollBy(-2);
    } else if (name === "down" || name === "j") {
      scrollRef.current?.scrollBy(2);
    }
  });

  const sensors = status?.sensors ?? [];
  const total = sensors.length;

  if (!status || total === 0) {
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

  // Build 2-column paired rows for all sensors
  const rows: Array<{
    left: (typeof sensors)[0];
    leftIdx: number;
    right?: (typeof sensors)[0];
    rightIdx?: number;
  }> = [];

  for (let i = 0; i < sensors.length; i += 2) {
    const leftSensor = sensors[i];
    if (!leftSensor) continue;
    rows.push({
      left: leftSensor,
      leftIdx: i,
      right: sensors[i + 1],
      rightIdx: i + 1 < sensors.length ? i + 1 : undefined,
    });
  }

  return (
    <box
      style={{
        flexGrow: 1,
        flexDirection: "column",
        borderStyle: "rounded",
        borderColor: theme.border,
        paddingLeft: 2,
        paddingRight: 2,
        paddingTop: 1,
        paddingBottom: 1,
        gap: 1,
      }}
    >
      {/* In-Card Header */}
      <box style={{ flexDirection: "row", alignItems: "center", marginBottom: 1 }}>
        <text attributes={TextAttributes.BOLD}>
          <span fg={theme.accent}>🌡️ </span>
          <span fg={theme.fg}>Temperature Sensors Catalog </span>
          <span fg={theme.muted}>({total} discovered)</span>
        </text>
      </box>

      <scrollbox
        ref={scrollRef}
        style={{ flexGrow: 1 }}
        focused
        verticalScrollbarOptions={getThinScrollbarOptions(theme)}
      >
        <box style={{ flexDirection: "column", gap: 1 }}>
          {rows.map((row) => (
            <box key={row.leftIdx} style={{ flexDirection: "row", gap: 2 }}>
              {/* Left Sensor Card */}
              <box
                style={{
                  width: "50%",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderStyle: "rounded",
                  borderColor: theme.border,
                  paddingLeft: 1,
                  paddingRight: 1,
                }}
              >
                <box style={{ flexDirection: "column" }}>
                  <text fg={theme.fg}>
                    {getSensorIcon(row.left.name)}{" "}
                    {row.left.name.length > 22 ? row.left.name.slice(0, 20) + ".." : row.left.name}
                  </text>
                  <text fg={theme.muted}>
                    <span>[{row.left.source.toUpperCase()}]</span>
                  </text>
                </box>

                <box style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
                  <Gauge
                    value={row.left.temperature}
                    min={25}
                    max={100}
                    width={10}
                    isTemperature
                    showPercentage={false}
                  />
                  <text fg={theme.fg} attributes={TextAttributes.BOLD}>
                    {row.left.temperature.toFixed(1)}°C
                  </text>
                </box>
              </box>

              {/* Right Sensor Card */}
              {row.right && row.rightIdx !== undefined ? (
                <box
                  style={{
                    width: "50%",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderStyle: "rounded",
                    borderColor: theme.border,
                    paddingLeft: 1,
                    paddingRight: 1,
                  }}
                >
                  <box style={{ flexDirection: "column" }}>
                    <text fg={theme.fg}>
                      {getSensorIcon(row.right.name)}{" "}
                      {row.right.name.length > 22
                        ? row.right.name.slice(0, 20) + ".."
                        : row.right.name}
                    </text>
                    <text fg={theme.muted}>
                      <span>[{row.right.source.toUpperCase()}]</span>
                    </text>
                  </box>

                  <box style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
                    <Gauge
                      value={row.right.temperature}
                      min={25}
                      max={100}
                      width={10}
                      isTemperature
                      showPercentage={false}
                    />
                    <text fg={theme.fg} attributes={TextAttributes.BOLD}>
                      {row.right.temperature.toFixed(1)}°C
                    </text>
                  </box>
                </box>
              ) : (
                <box style={{ width: "50%" }} />
              )}
            </box>
          ))}
        </box>
      </scrollbox>

      {/* Navigation Footer */}
      <box
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingLeft: 1,
          paddingRight: 1,
          gap: 2,
        }}
      >
        <text fg={theme.muted}>
          <span>Discovered sensors: </span>
          <span fg={theme.accent} attributes={TextAttributes.BOLD}>
            {total}
          </span>
          <span> active hardware sensors</span>
        </text>
        <text fg={theme.muted}>Use [↑ / ↓ / k / j] or trackpad/mouse to scroll</text>
      </box>
    </box>
  );
};
