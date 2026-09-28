import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";
import type { ControllerStatus } from "../../types/controller";
import { Gauge } from "../components/Gauge";

export function FansScreen({
  status,
  selectedFanIndex,
}: {
  status: ControllerStatus | null;
  selectedFanIndex: number;
}) {
  const theme = useTheme();

  if (!status || status.fans.length === 0) {
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
        <text fg={theme.muted}>No controllable fans found on this system.</text>
      </box>
    );
  }

  const selectedFan = status.fans[selectedFanIndex] ?? status.fans[0];
  if (!selectedFan) return null;

  return (
    <box style={{ flexDirection: "column", flexGrow: 1, gap: 1 }}>
      {/* Top Banner / Selection */}
      <box
        style={{
          flexDirection: "row",
          borderStyle: "rounded",
          borderColor: theme.border,
          paddingLeft: 2,
          paddingRight: 2,
          paddingTop: 1,
          paddingBottom: 1,
          justifyContent: "space-between",
        }}
      >
        <box style={{ flexDirection: "row", gap: 2 }}>
          {status.fans.map((fan, idx) => {
            const isSel = idx === selectedFanIndex;
            return (
              <box
                key={fan.id}
                style={{
                  borderStyle: "rounded",
                  borderColor: isSel ? theme.accent : theme.border,
                  backgroundColor: isSel ? theme.selectedBg : undefined,
                  paddingLeft: 2,
                  paddingRight: 2,
                }}
              >
                <text
                  fg={isSel ? theme.accent : theme.muted}
                  attributes={isSel ? TextAttributes.BOLD : undefined}
                >
                  {isSel ? "▶ " : "  "}
                  {fan.name} ({Math.round(fan.currentRpm)} RPM)
                </text>
              </box>
            );
          })}
        </box>
        <text fg={theme.muted}>Press [Tab] or [↑/↓] to select fan</text>
      </box>

      {/* Main Fan Control Card */}
      <box
        style={{
          flexGrow: 1,
          flexDirection: "column",
          borderStyle: "rounded",
          borderColor: theme.accent,
          paddingLeft: 3,
          paddingRight: 3,
          paddingTop: 1,
          paddingBottom: 2,
          gap: 1,
        }}
        title={` 🌀 ${selectedFan.name} Configuration & Manual Pinning `}
      >
        <box style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 1 }}>
          <box style={{ flexDirection: "column" }}>
            <text fg={theme.muted}>Current RPM Speed:</text>
            <text fg={theme.accent} attributes={TextAttributes.BOLD}>
              <span>{Math.round(selectedFan.currentRpm)}</span>
              <span fg={theme.muted}> RPM</span>
            </text>
          </box>

          <box style={{ flexDirection: "column", alignItems: "center" }}>
            <text fg={theme.muted}>Target RPM:</text>
            <text fg={theme.fg} attributes={TextAttributes.BOLD}>
              <span>{Math.round(selectedFan.targetRpm)}</span>
              <span fg={theme.muted}> RPM</span>
            </text>
          </box>

          <box style={{ flexDirection: "column", alignItems: "flex-end" }}>
            <text fg={theme.muted}>Control Mode:</text>
            <text
              fg={selectedFan.mode === "manual" ? theme.fanManual : theme.fanAuto}
              attributes={TextAttributes.BOLD}
            >
              {selectedFan.mode === "manual" ? "● MANUAL PINNED" : "○ AUTOMATIC DYNAMIC"}
            </text>
          </box>
        </box>

        {/* Speed Slider Meter */}
        <box style={{ flexDirection: "column", marginTop: 2, marginBottom: 1 }}>
          <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
            <text fg={theme.muted}>Min: {Math.round(selectedFan.minRpm)} RPM</text>
            <text fg={theme.accent} attributes={TextAttributes.BOLD}>
              Fan Velocity Meter
            </text>
            <text fg={theme.muted}>Max: {Math.round(selectedFan.maxRpm)} RPM</text>
          </box>
          <Gauge
            value={selectedFan.currentRpm}
            min={selectedFan.minRpm}
            max={selectedFan.maxRpm}
            width={64}
            isTemperature={false}
          />
        </box>

        {/* Action Controls Box */}
        <box
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            borderStyle: "rounded",
            borderColor: theme.border,
            paddingLeft: 2,
            paddingRight: 2,
            paddingTop: 1,
            paddingBottom: 1,
            marginTop: 2,
          }}
        >
          <box style={{ flexDirection: "row", gap: 2 }}>
            <text>
              <span fg={theme.accent} attributes={TextAttributes.BOLD}>
                [← / Left]
              </span>
              <span fg={theme.fg}> -100 RPM</span>
            </text>
            <text>
              <span fg={theme.accent} attributes={TextAttributes.BOLD}>
                [→ / Right]
              </span>
              <span fg={theme.fg}> +100 RPM</span>
            </text>
          </box>

          <box style={{ flexDirection: "row", gap: 2 }}>
            <text>
              <span fg={theme.accent} attributes={TextAttributes.BOLD}>
                [m]
              </span>
              <span fg={theme.fg}> Toggle Mode (Auto/Manual)</span>
            </text>
          </box>
        </box>

        <box style={{ marginTop: 1 }}>
          <text fg={theme.muted}>
            💡 Notice: In Manual Mode, your target speed is persisted to config.toml and maintained
            by the background daemon even when this interface is closed.
          </text>
        </box>
      </box>
    </box>
  );
}
