import { useRef } from "react";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useTheme } from "../ThemeContext";
import { DEFAULT_FAN_CURVE } from "../../config/config";
import type { ControllerStatus } from "../../types/controller";
import type { FanCurvePoint } from "../../types/fan";
import { getThinScrollbarOptions } from "../scrollbar";

const interpolateRpm = (temp: number, curve: FanCurvePoint[]): number => {
  if (curve.length === 0) return 2000;
  const sorted = [...curve].sort((a, b) => a.temperature - b.temperature);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return 2000;
  if (temp <= first.temperature) return first.rpm;
  if (temp >= last.temperature) return last.rpm;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (p1 && p2 && temp >= p1.temperature && temp <= p2.temperature) {
      const frac = (temp - p1.temperature) / (p2.temperature - p1.temperature);
      return Math.round(p1.rpm + frac * (p2.rpm - p1.rpm));
    }
  }
  return first.rpm;
};

export const CurveScreen = ({
  status,
  curve = DEFAULT_FAN_CURVE,
}: {
  status: ControllerStatus | null;
  curve?: FanCurvePoint[];
}) => {
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

  // Find active controlling sensor
  const highestSensor = status?.sensors.reduce<null | { name: string; temperature: number }>(
    (max, s) => (!max || s.temperature > max.temperature ? s : max),
    null,
  );
  const currentTemp = highestSensor?.temperature ?? null;
  const liveRpm = currentTemp !== null ? interpolateRpm(currentTemp, curve) : null;

  // Fully connected, unbroken staircase tiers matching DEFAULT_FAN_CURVE
  // Exact 90° aligned graph with unbroken continuous lines and precise column matching
  // Col 0..3: RPM (4 chars)
  // Col 4: ' '
  // Col 5: '│'
  // Col 6: ' '
  // Col 7: start of graph line (index 0)
  // Threshold points at cols 15 (45°C), 25 (55°C), 35 (65°C), 45 (75°C), 55 (85°C)
  // Risers at cols 20 (50°C), 30 (60°C), 40 (70°C), 50 (80°C)
  const graphLines = [
    {
      rpmLabel: "5500",
      prefix: "                                           ╭────◆───────► MAX (5500 RPM)",
      color: theme.tempCritical,
    },
    {
      rpmLabel: "    ",
      prefix: "                                           │",
      color: theme.tempHot,
    },
    {
      rpmLabel: "4500",
      prefix: "                                 ╭────◆────╯",
      color: theme.tempHot,
    },
    {
      rpmLabel: "    ",
      prefix: "                                 │",
      color: theme.tempWarm,
    },
    {
      rpmLabel: "3500",
      prefix: "                       ╭────◆────╯",
      color: theme.tempWarm,
    },
    {
      rpmLabel: "    ",
      prefix: "                       │",
      color: theme.tempWarm,
    },
    {
      rpmLabel: "2500",
      prefix: "             ╭────◆────╯",
      color: theme.tempWarm,
    },
    {
      rpmLabel: "    ",
      prefix: "             │",
      color: theme.tempCool,
    },
    {
      rpmLabel: "1800",
      prefix: "────────◆────╯",
      color: theme.tempCool,
    },
  ];

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
          paddingLeft: 3,
          paddingRight: 3,
          paddingTop: 1,
          paddingBottom: 2,
          gap: 1,
        }}
      >
        <box style={{ flexDirection: "row", alignItems: "center", marginBottom: 1 }}>
          <text attributes={TextAttributes.BOLD}>
            <span fg={theme.accent}>📈 </span>
            <span fg={theme.fg}>Automatic Dynamic Fan Curve</span>
          </text>
        </box>

        {/* Header status row */}
        <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
          <box style={{ flexDirection: "row", gap: 1 }}>
            <text fg={theme.fg} attributes={TextAttributes.BOLD}>
              <span>Active Sensor Input: </span>
              <span fg={theme.accent}>
                {highestSensor
                  ? `${highestSensor.name} (${highestSensor.temperature.toFixed(1)}°C)`
                  : "Highest Thermal Die / CPU Package"}
              </span>
            </text>
          </box>
          <box style={{ flexDirection: "row", gap: 2 }}>
            {currentTemp !== null && liveRpm !== null ? (
              <text>
                <span fg={theme.fanManual} attributes={TextAttributes.BOLD}>
                  ● LIVE: {currentTemp.toFixed(1)}°C ➔ {liveRpm} RPM
                </span>
              </text>
            ) : null}
            <text fg={theme.muted}>
              Mode:{" "}
              {status?.mode === "auto"
                ? "● Active in Controller"
                : "○ Inactive (Manual Mode active)"}
            </text>
          </box>
        </box>

        {/* Connected Staircase Fan Curve Graph */}
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
          <box style={{ flexDirection: "row", marginBottom: 0 }}>
            <text fg={theme.muted}>
              <span>RPM</span>
            </text>
          </box>

          {graphLines.map((t, idx) => {
            const parts = t.prefix.split("◆");
            return (
              <box key={idx} style={{ flexDirection: "row" }}>
                <text>
                  <span fg={theme.muted}>{t.rpmLabel} │ </span>
                  {parts.length === 1 ? (
                    <span fg={t.color}>{t.prefix}</span>
                  ) : (
                    <>
                      <span fg={t.color}>{parts[0]}</span>
                      <span fg={theme.accent} attributes={TextAttributes.BOLD}>
                        ◆
                      </span>
                      <span
                        fg={t.color}
                        attributes={parts[1]?.includes("MAX") ? TextAttributes.BOLD : undefined}
                      >
                        {parts[1]}
                      </span>
                    </>
                  )}
                </text>
              </box>
            );
          })}

          {/* Aligned axis and ticks with exact 90-degree origin alignment at column 5 */}
          <box style={{ flexDirection: "row", marginTop: 0 }}>
            <text fg={theme.muted}>
              {"     └───┬────┬─────────┬─────────┬─────────┬─────────┬─────────► Temperature (°C)"}
            </text>
          </box>
          <box style={{ flexDirection: "row", marginTop: 0 }}>
            <text fg={theme.muted}>
              {"         40°C 45°C      55°C      65°C      75°C      85°C"}
            </text>
          </box>

          {/* Legend */}
          <box style={{ flexDirection: "row", marginTop: 1, gap: 2 }}>
            <text fg={theme.muted}>
              <span fg={theme.accent} attributes={TextAttributes.BOLD}>
                ◆{" "}
              </span>
              <span>Configured Threshold Point </span>
              <span fg={theme.fanManual} attributes={TextAttributes.BOLD}>
                ●{" "}
              </span>
              <span>Live Operating Point </span>
              <span fg={theme.tempCool}>──</span>
              <span fg={theme.tempWarm}>──</span>
              <span fg={theme.tempHot}>──</span>
              <span fg={theme.tempCritical}>── </span>
              <span>Dynamic Interpolation</span>
            </text>
          </box>
        </box>

        {/* Threshold Points Table with Rigid Column Widths */}
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
        >
          <box style={{ flexDirection: "row", alignItems: "center", marginBottom: 1 }}>
            <text attributes={TextAttributes.BOLD}>
              <span fg={theme.accent}>🎯 </span>
              <span fg={theme.fg}>Interpolation Threshold Points & Thermal Zones</span>
            </text>
          </box>
          <box style={{ flexDirection: "row", marginBottom: 1 }}>
            <box style={{ width: 22 }}>
              <text fg={theme.muted} attributes={TextAttributes.BOLD}>
                TEMPERATURE (°C)
              </text>
            </box>
            <box style={{ width: 26 }}>
              <text fg={theme.muted} attributes={TextAttributes.BOLD}>
                TARGET FAN SPEED
              </text>
            </box>
            <box style={{ flexGrow: 1 }}>
              <text fg={theme.muted} attributes={TextAttributes.BOLD}>
                THERMAL ZONE & BEHAVIOR
              </text>
            </box>
          </box>

          {curve.map((pt) => {
            const zone =
              pt.temperature >= 80
                ? { label: "Critical / Maximum Ramp", color: theme.tempCritical }
                : pt.temperature >= 70
                  ? { label: "Hot / Heavy Workload", color: theme.tempHot }
                  : pt.temperature >= 55
                    ? { label: "Warm / Active Processing", color: theme.tempWarm }
                    : { label: "Cool / Silent (Idle)", color: theme.tempCool };

            return (
              <box key={pt.temperature} style={{ flexDirection: "row", marginTop: 0 }}>
                <box style={{ width: 22 }}>
                  <text fg={theme.fg} attributes={TextAttributes.BOLD}>
                    {pt.temperature}°C
                  </text>
                </box>
                <box style={{ width: 26 }}>
                  <text fg={theme.accent} attributes={TextAttributes.BOLD}>
                    {pt.rpm} RPM
                  </text>
                </box>
                <box style={{ flexGrow: 1 }}>
                  <text fg={zone.color}>● {zone.label}</text>
                </box>
              </box>
            );
          })}
        </box>
      </box>
    </scrollbox>
  );
};
