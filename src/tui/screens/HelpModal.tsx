import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";

export interface HelpModalProps {
  onClose?: () => void;
}

export const HelpModal = ({ onClose: _onClose }: HelpModalProps) => {
  const theme = useTheme();

  return (
    <box
      style={{
        position: "absolute",
        top: 2,
        bottom: 2,
        left: 6,
        right: 6,
        borderStyle: "rounded",
        borderColor: theme.accent,
        backgroundColor: theme.bg ?? "#1a1b26",
        flexDirection: "column",
        paddingLeft: 3,
        paddingRight: 3,
        paddingTop: 1,
        paddingBottom: 1,
        gap: 1,
        zIndex: 50,
      }}
    >
      <box style={{ flexDirection: "row", alignItems: "center", marginBottom: 0 }}>
        <text attributes={TextAttributes.BOLD}>
          <span fg={theme.accent}>❓ </span>
          <span fg={theme.fg}>Help & Interactive Hotkeys</span>
        </text>
      </box>

      <box
        style={{
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
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            [1] or [d]
          </text>
          <text fg={theme.fg}>
            Dashboard: System summary, fan velocity gauges, controller health
          </text>
        </box>
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            [2] or [t]
          </text>
          <text fg={theme.fg}>
            Temperatures: 2-column catalog of all discovered hardware sensors
          </text>
        </box>
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            [3] or [c]
          </text>
          <text fg={theme.fg}>Fan Curve: Visual ASCII temperature curve and threshold table</text>
        </box>
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            [4] or [s]
          </text>
          <text fg={theme.fg}>Settings: Interactive Theme Picker and daemon parameters</text>
        </box>
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            [m]
          </text>
          <text fg={theme.fg}>Toggle Fan Mode between Automatic (curve) and Manual override</text>
        </box>
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            [← / →]
          </text>
          <text fg={theme.fg}>Adjust target fan speed (±500 RPM step)</text>
        </box>
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            [Tab]
          </text>
          <text fg={theme.fg}>Switch selected fan on Dashboard</text>
        </box>
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            [↑ / ↓ / k / j]
          </text>
          <text fg={theme.fg}>Scroll sensor catalog and fan curve diagrams</text>
        </box>
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            [T] (Shift+t)
          </text>
          <text fg={theme.fg}>
            Cycle color themes (TokyoNight, Catppuccin, Nord, Obsidian, etc.)
          </text>
        </box>
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            [x]
          </text>
          <text fg={theme.fg}>Close active toast notification one by one</text>
        </box>
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            [r]
          </text>
          <text fg={theme.fg}>Force immediate telemetry refresh from background controller</text>
        </box>
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            [q] or [Esc]
          </text>
          <text fg={theme.fg}>Close this help modal or exit the TUI</text>
        </box>
      </box>

      <box style={{ alignItems: "center", marginTop: 1 }}>
        <text fg={theme.muted}>
          Press{" "}
          <span fg={theme.accent} attributes={TextAttributes.BOLD}>
            [Esc]
          </span>
          ,{" "}
          <span fg={theme.accent} attributes={TextAttributes.BOLD}>
            [?]
          </span>
          , or click anywhere to dismiss.
        </text>
      </box>
    </box>
  );
};
