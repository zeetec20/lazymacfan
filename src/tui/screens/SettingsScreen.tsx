import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";
import { THEME_NAMES, type ThemeName } from "../theme";
import type { ControllerStatus } from "../../types/controller";
import type { AppConfig } from "../../config/config";

export function SettingsScreen({
  status,
  config,
  serviceInstalled,
  currentThemeName,
  onSelectTheme,
}: {
  status: ControllerStatus | null;
  config: AppConfig;
  serviceInstalled: boolean;
  currentThemeName: ThemeName;
  onSelectTheme: (name: ThemeName) => void;
}) {
  const theme = useTheme();

  return (
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
      title=" ⚙️ Settings & Configuration "
    >
      {/* Theme Picker Box */}
      <box
        style={{
          flexDirection: "column",
          borderStyle: "rounded",
          borderColor: theme.border,
          paddingLeft: 2,
          paddingRight: 2,
          paddingTop: 1,
          paddingBottom: 1,
        }}
        title=" 🎨 UI Color Theme "
      >
        <box style={{ flexDirection: "row", flexWrap: "wrap", gap: 1, marginTop: 1 }}>
          {THEME_NAMES.map((name) => {
            const isSel = name === currentThemeName;
            return (
              <box
                key={name}
                onMouseDown={() => onSelectTheme(name)}
                style={{
                  borderStyle: "rounded",
                  borderColor: isSel ? theme.accent : theme.border,
                  backgroundColor: isSel ? theme.selectedBg : undefined,
                  paddingLeft: 1,
                  paddingRight: 1,
                }}
              >
                <text
                  fg={isSel ? theme.accent : theme.muted}
                  attributes={isSel ? TextAttributes.BOLD : undefined}
                >
                  {isSel ? "● " : "○ "}
                  {name}
                </text>
              </box>
            );
          })}
        </box>
        <text fg={theme.muted} style={{ marginTop: 1 }}>
          Press [T] anywhere in the application to cycle themes dynamically.
        </text>
      </box>

      {/* Daemon Parameters */}
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
        title=" ⚡ Controller Parameters "
      >
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.muted}>Polling Interval:</text>
          <text fg={theme.fg} attributes={TextAttributes.BOLD}>
            {config.controller.pollIntervalMs} ms (1 second)
          </text>
        </box>

        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.muted}>Emergency Temperature Override:</text>
          <text fg={theme.tempCritical} attributes={TextAttributes.BOLD}>
            {config.controller.emergencyTempC}°C (Forces 100% Fan Speed)
          </text>
        </box>

        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.muted}>Configuration File:</text>
          <text fg={theme.fg}>~/Library/Application Support/lazymacfan/config.toml</text>
        </box>
      </box>

      {/* Service Status */}
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
        title=" 🚀 Background System Service (launchd) "
      >
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.muted}>Start at Login (Service Installed):</text>
          <text
            fg={serviceInstalled ? theme.tempCool : theme.muted}
            attributes={TextAttributes.BOLD}
          >
            {serviceInstalled ? "✓ Enabled" : "○ Not installed"}
          </text>
        </box>

        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg={theme.muted}>Daemon PID:</text>
          <text fg={theme.fg}>{status?.pid ?? "None"}</text>
        </box>

        <box style={{ marginTop: 1 }}>
          <text fg={theme.muted}>
            To manage system service from CLI: lazymacfan service start | stop | status
          </text>
        </box>
      </box>
    </box>
  );
}
