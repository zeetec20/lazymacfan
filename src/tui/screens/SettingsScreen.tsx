import { useRef } from "react";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { homedir } from "node:os";
import { useTheme } from "../ThemeContext";
import { THEME_NAMES, type ThemeName } from "../theme";
import type { ControllerStatus } from "../../types/controller";
import type { AppConfig } from "../../config/config";
import { CONFIG_FILE } from "../../config/persistence";
import { getThinScrollbarOptions } from "../scrollbar";

export const SettingsScreen = ({
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
}) => {
  const theme = useTheme();
  const scrollRef = useRef<any>(null);

  useKeyboard((key) => {
    const name = key.name.toLowerCase();
    if (name === "up" || name === "k") {
      scrollRef.current?.scrollBy(-2);
    } else if (name === "down" || name === "j") {
      scrollRef.current?.scrollBy(2);
    }
  });

  return (
    <scrollbox
      ref={scrollRef}
      style={{ flexGrow: 1 }}
      focused
      verticalScrollbarOptions={getThinScrollbarOptions(theme)}
    >
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
        {/* Outer Header */}
        <box style={{ flexDirection: "row", alignItems: "center", marginBottom: 0 }}>
          <text attributes={TextAttributes.BOLD}>
            <span fg={theme.accent}>🔧 </span>
            <span fg={theme.fg}>Settings & Configuration</span>
          </text>
        </box>

        {/* Theme Picker Box (Top) */}
        <box
          style={{
            flexDirection: "column",
            borderStyle: "rounded",
            borderColor: theme.border,
            paddingLeft: 2,
            paddingRight: 2,
            paddingTop: 1,
            paddingBottom: 1,
            flexShrink: 0,
          }}
        >
          <box style={{ flexDirection: "row", alignItems: "center", marginBottom: 1 }}>
            <text attributes={TextAttributes.BOLD}>
              <span fg={theme.accent}>🎨 </span>
              <span fg={theme.fg}>UI Color Theme</span>
            </text>
          </box>

          <box style={{ flexDirection: "row", flexWrap: "wrap", gap: 1, marginTop: 0 }}>
            {THEME_NAMES.map((name) => {
              const isSel = name === currentThemeName;
              return (
                <box
                  key={name}
                  onMouseUp={() => onSelectTheme(name)}
                  style={{
                    borderStyle: "rounded",
                    borderColor: isSel ? theme.accent : theme.border,
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

          {/* Selected Theme Color Preset Preview */}
          <box
            style={{
              flexDirection: "column",
              borderStyle: "rounded",
              borderColor: theme.border,
              paddingLeft: 2,
              paddingRight: 2,
              paddingTop: 1,
              paddingBottom: 1,
              marginTop: 1,
              gap: 1,
            }}
          >
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={theme.fg} attributes={TextAttributes.BOLD}>
                <span>Palette Preview: </span>
                <span fg={theme.accent}>● {currentThemeName.toUpperCase()}</span>
              </text>
              <text fg={theme.muted}>Background: {theme.bg ?? "terminal-default"}</text>
            </box>

            <box style={{ flexDirection: "row", flexWrap: "wrap", gap: 2 }}>
              <text>
                <span fg={theme.accent}>■ </span>
                <span fg={theme.fg}>Accent: </span>
                <span fg={theme.accent} attributes={TextAttributes.BOLD}>
                  {theme.accent}
                </span>
              </text>
              <text>
                <span fg={theme.tempCool}>■ </span>
                <span fg={theme.fg}>Cool: </span>
                <span fg={theme.tempCool} attributes={TextAttributes.BOLD}>
                  {theme.tempCool}
                </span>
              </text>
              <text>
                <span fg={theme.tempWarm}>■ </span>
                <span fg={theme.fg}>Warm: </span>
                <span fg={theme.tempWarm} attributes={TextAttributes.BOLD}>
                  {theme.tempWarm}
                </span>
              </text>
              <text>
                <span fg={theme.tempHot}>■ </span>
                <span fg={theme.fg}>Hot: </span>
                <span fg={theme.tempHot} attributes={TextAttributes.BOLD}>
                  {theme.tempHot}
                </span>
              </text>
              <text>
                <span fg={theme.tempCritical}>■ </span>
                <span fg={theme.fg}>Critical: </span>
                <span fg={theme.tempCritical} attributes={TextAttributes.BOLD}>
                  {theme.tempCritical}
                </span>
              </text>
              <text>
                <span fg={theme.fanAuto}>■ </span>
                <span fg={theme.fg}>Auto: </span>
                <span fg={theme.fanAuto} attributes={TextAttributes.BOLD}>
                  {theme.fanAuto}
                </span>
              </text>
              <text>
                <span fg={theme.fanManual}>■ </span>
                <span fg={theme.fg}>Manual: </span>
                <span fg={theme.fanManual} attributes={TextAttributes.BOLD}>
                  {theme.fanManual}
                </span>
              </text>
              <text>
                <span fg={theme.border}>■ </span>
                <span fg={theme.fg}>Border: </span>
                <span fg={theme.muted} attributes={TextAttributes.BOLD}>
                  {theme.border}
                </span>
              </text>
            </box>
          </box>

          <box style={{ marginTop: 1 }}>
            <text fg={theme.muted}>
              <span>Tip: Press </span>
              <span fg={theme.accent} attributes={TextAttributes.BOLD}>
                [T]
              </span>
              <span> anywhere to cycle color themes dynamically.</span>
            </text>
          </box>
        </box>

        {/* Dual Columns: Controller Parameters (Left 50%) & Hardware / Service (Right 50%) */}
        <box style={{ flexDirection: "row", flexGrow: 1, gap: 1 }}>
          {/* Left Column: Controller Parameters */}
          <box
            style={{
              width: "50%",
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
            <box style={{ flexDirection: "row", alignItems: "center", marginBottom: 1 }}>
              <text attributes={TextAttributes.BOLD}>
                <span fg={theme.accent}>⚡ </span>
                <span fg={theme.fg}>Controller Parameters</span>
              </text>
            </box>

            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={theme.muted}>Polling Interval:</text>
              <text fg={theme.fg} attributes={TextAttributes.BOLD}>
                {config.controller.pollIntervalMs} ms (1s)
              </text>
            </box>

            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={theme.muted}>Emergency Cutoff:</text>
              <text fg={theme.tempCritical} attributes={TextAttributes.BOLD}>
                {config.controller.emergencyTempC}°C (100% Fan)
              </text>
            </box>

            <box style={{ flexDirection: "column", marginTop: 0 }}>
              <text fg={theme.muted}>Config File:</text>
              <text fg={theme.fg}>{CONFIG_FILE.replace(homedir(), "~")}</text>
            </box>
          </box>

          {/* Right Column: Hardware Privileges & Background Service */}
          <box
            style={{
              width: "50%",
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
            <box style={{ flexDirection: "row", alignItems: "center", marginBottom: 1 }}>
              <text attributes={TextAttributes.BOLD}>
                <span fg={theme.accent}>🔒 </span>
                <span fg={theme.fg}>Hardware Access & Service</span>
              </text>
            </box>

            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={theme.muted}>AppleSMC Fan Control:</text>
              <text
                fg={status?.privileged === false ? theme.tempWarm : theme.tempCool}
                attributes={TextAttributes.BOLD}
              >
                {status?.privileged === false
                  ? "🔒 Read-Only (Root Required)"
                  : "✓ Full Control (Authorized)"}
              </text>
            </box>

            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={theme.muted}>Background Service:</text>
              <text
                fg={serviceInstalled ? theme.tempCool : theme.muted}
                attributes={TextAttributes.BOLD}
              >
                {serviceInstalled ? "✓ Enabled (Active)" : "○ Not installed"}
              </text>
            </box>

            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={theme.muted}>Daemon PID:</text>
              <text fg={theme.fg}>{status?.pid ?? "Offline"}</text>
            </box>

            <box style={{ marginTop: 0 }}>
              {status?.privileged === false ? (
                <text fg={theme.tempWarm}>
                  Run &apos;sudo lazymacfan helper setup&apos; in terminal to enable fan control.
                </text>
              ) : (
                <text fg={theme.muted}>Service CLI: lazymacfan service start | stop | status</text>
              )}
            </box>
          </box>
        </box>
      </box>
    </scrollbox>
  );
};
