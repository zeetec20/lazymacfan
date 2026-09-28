import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";
import { DEFAULT_FAN_CURVE } from "../../config/config";
import type { ControllerStatus } from "../../types/controller";
import type { FanCurvePoint } from "../../types/fan";

export function CurveScreen({
  status,
  curve = DEFAULT_FAN_CURVE,
}: {
  status: ControllerStatus | null;
  curve?: FanCurvePoint[];
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
      title=" 📈 Automatic Dynamic Fan Curve "
    >
      <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
        <text fg={theme.fg} attributes={TextAttributes.BOLD}>
          <span>Active Sensor Input: </span>
          <span fg={theme.accent}>Highest Thermal Die / CPU Package</span>
        </text>
        <text fg={theme.muted}>
          Mode:{" "}
          {status?.mode === "auto" ? "● Active in Controller" : "○ Inactive (Manual Mode active)"}
        </text>
      </box>

      {/* ASCII Curve Graph */}
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
      >
        <text fg={theme.muted}>
          <span>RPM</span>
        </text>
        <text>
          <span fg={theme.muted}>6000 │ </span>
          <span fg={theme.tempCritical} attributes={TextAttributes.BOLD}>
            {"                                 * 6000 RPM (85°C)"}
          </span>
        </text>
        <text>
          <span fg={theme.muted}>5000 │ </span>
          <span fg={theme.tempHot} attributes={TextAttributes.BOLD}>
            {"                         * 5000 RPM (75°C)"}
          </span>
        </text>
        <text>
          <span fg={theme.muted}>4000 │ </span>
          <span fg={theme.tempWarm} attributes={TextAttributes.BOLD}>
            {"                 * 4000 RPM (65°C)"}
          </span>
        </text>
        <text>
          <span fg={theme.muted}>3000 │ </span>
          <span fg={theme.accent} attributes={TextAttributes.BOLD}>
            {"         * 3000 RPM (55°C)"}
          </span>
        </text>
        <text>
          <span fg={theme.muted}>2000 │ </span>
          <span fg={theme.tempCool} attributes={TextAttributes.BOLD}>
            {" * 1800 RPM (45°C)"}
          </span>
        </text>
        <text>
          <span fg={theme.muted}>1000 │ </span>
        </text>
        <text fg={theme.muted}>
          <span> └────────────────────────────────────────────────────────────► Temperature</span>
        </text>
        <text fg={theme.muted}>
          <span> 40°C 50°C 60°C 70°C 80°C 90°C</span>
        </text>
      </box>

      {/* Threshold Points Table */}
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
        }}
        title=" Interpolation Threshold Points "
      >
        <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
          <text fg={theme.muted} attributes={TextAttributes.BOLD}>
            TEMPERATURE (°C)
          </text>
          <text fg={theme.muted} attributes={TextAttributes.BOLD}>
            TARGET FAN SPEED
          </text>
          <text fg={theme.muted} attributes={TextAttributes.BOLD}>
            BEHAVIOR
          </text>
        </box>

        {curve.map((pt) => (
          <box
            key={pt.temperature}
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <text fg={theme.fg} attributes={TextAttributes.BOLD}>
              {pt.temperature}°C
            </text>
            <text fg={theme.accent}>{pt.rpm} RPM</text>
            <text fg={theme.muted}>Linear interpolation</text>
          </box>
        ))}
      </box>
    </box>
  );
}
