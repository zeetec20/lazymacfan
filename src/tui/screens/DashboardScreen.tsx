import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";
import type { ControllerStatus } from "../../types/controller";
import { Wordmark } from "../components/Wordmark";
import { Gauge } from "../components/Gauge";

export const DashboardScreen = ({
  status,
  selectedFanIndex,
}: {
  status: ControllerStatus | null;
  selectedFanIndex: number;
}) => {
  const theme = useTheme();

  if (!status) {
    return (
      <box
        style={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>
          Connecting to lazymacfan background controller...
        </text>
        <text fg={theme.muted}>Make sure the agent is running: lazymacfan agent</text>
      </box>
    );
  }

  // Identify key sensors
  const cpuSensor = status.sensors.find((s) => /cpu|tdie/i.test(s.name));
  const gpuSensor = status.sensors.find((s) => /gpu/i.test(s.name));
  const batSensor = status.sensors.find((s) => /battery|gauge/i.test(s.name));

  const cpuTemp = cpuSensor ? cpuSensor.temperature : 45;
  const gpuTemp = gpuSensor ? gpuSensor.temperature : 40;
  const batTemp = batSensor ? batSensor.temperature : 30;

  const h = Math.floor(status.uptimeSeconds / 3600);
  const m = Math.floor((status.uptimeSeconds % 3600) / 60);
  const s = status.uptimeSeconds % 60;
  const uptimeStr = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;

  return (
    <box style={{ flexDirection: "row", flexGrow: 1, gap: 1 }}>
      {/* Left Column: Wordmark & Fan Telemetry */}
      <box style={{ width: "50%", flexDirection: "column", gap: 1 }}>
        {/* Banner Card */}
        <box
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 1,
            paddingBottom: 1,
          }}
        >
          <Wordmark />
        </box>

        {/* Fans Card */}
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
          <box
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 1,
            }}
          >
            <text attributes={TextAttributes.BOLD}>
              <span fg={theme.accent}>🌀 </span>
              <span fg={theme.fg}>Fans Telemetry & Controls</span>
            </text>
            <text
              fg={status.privileged === false ? theme.tempWarm : theme.tempCool}
              attributes={TextAttributes.BOLD}
            >
              {status.privileged === false ? "🔒 Read-Only" : "⚡ Full Control"}
            </text>
          </box>

          {status.fans.length === 0 ? (
            <text fg={theme.muted}>No fans detected on this Mac.</text>
          ) : (
            status.fans.map((fan, idx) => {
              const isSelected = idx === selectedFanIndex;
              const isManual = fan.mode === "manual";
              return (
                <box
                  key={fan.id}
                  style={{
                    flexDirection: "column",
                    borderStyle: "rounded",
                    borderColor: isSelected ? theme.accent : theme.border,
                    paddingLeft: 1,
                    paddingRight: 1,
                    paddingTop: 0,
                    paddingBottom: 0,
                    marginBottom: 1,
                  }}
                >
                  <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <text
                      fg={isSelected ? theme.accent : theme.fg}
                      attributes={isSelected ? TextAttributes.BOLD : undefined}
                    >
                      {isSelected ? "▶ " : "  "}
                      {fan.name}
                    </text>
                    <text>
                      <span
                        fg={isManual ? theme.fanManual : theme.fanAuto}
                        attributes={TextAttributes.BOLD}
                      >
                        {isManual ? "● MANUAL" : "○ AUTO"}
                      </span>
                    </text>
                  </box>

                  <box
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 0,
                    }}
                  >
                    <text fg={theme.fg}>
                      <span>{Math.round(fan.currentRpm)} RPM</span>
                      <span fg={theme.muted}> / Target: {Math.round(fan.targetRpm)} RPM</span>
                    </text>
                    <text fg={theme.muted}>
                      {Math.round(fan.minRpm)} - {Math.round(fan.maxRpm)} RPM
                    </text>
                  </box>

                  <box style={{ marginTop: 0, marginBottom: 1 }}>
                    <Gauge
                      value={fan.currentRpm}
                      min={fan.minRpm}
                      max={fan.maxRpm}
                      width={30}
                      isTemperature={false}
                    />
                  </box>
                </box>
              );
            })
          )}
        </box>
      </box>

      {/* Right Column: Thermal Sensors & Controller State */}
      <box style={{ width: "50%", flexDirection: "column", gap: 1 }}>
        {/* Thermal Overview Card */}
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
          <box style={{ flexDirection: "row", alignItems: "center", marginBottom: 1 }}>
            <text attributes={TextAttributes.BOLD}>
              <span fg={theme.tempWarm}>🔥 </span>
              <span fg={theme.fg}>Core Temperature Telemetry</span>
            </text>
          </box>

          {/* CPU Row */}
          <box style={{ flexDirection: "column", marginBottom: 1 }}>
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={theme.fg}>
                <span attributes={TextAttributes.BOLD}>⚡ CPU Package / Die</span>
                <span fg={theme.muted}> ({cpuSensor?.name ?? "Auto"})</span>
              </text>
              <text fg={theme.fg} attributes={TextAttributes.BOLD}>
                {cpuTemp.toFixed(1)}°C
              </text>
            </box>
            <Gauge
              value={cpuTemp}
              min={30}
              max={105}
              width={34}
              isTemperature
              showPercentage={false}
            />
          </box>

          {/* GPU Row */}
          <box style={{ flexDirection: "column", marginBottom: 1 }}>
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={theme.fg}>
                <span attributes={TextAttributes.BOLD}>🎮 GPU Core</span>
                <span fg={theme.muted}> ({gpuSensor?.name ?? "GPU"})</span>
              </text>
              <text fg={theme.fg} attributes={TextAttributes.BOLD}>
                {gpuTemp.toFixed(1)}°C
              </text>
            </box>
            <Gauge
              value={gpuTemp}
              min={30}
              max={105}
              width={34}
              isTemperature
              showPercentage={false}
            />
          </box>

          {/* Battery Row */}
          <box style={{ flexDirection: "column", marginBottom: 1 }}>
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={theme.fg}>
                <span attributes={TextAttributes.BOLD}>🔋 Battery Module</span>
                <span fg={theme.muted}> ({batSensor?.name ?? "Battery"})</span>
              </text>
              <text fg={theme.fg} attributes={TextAttributes.BOLD}>
                {batTemp.toFixed(1)}°C
              </text>
            </box>
            <Gauge
              value={batTemp}
              min={20}
              max={65}
              width={34}
              isTemperature
              showPercentage={false}
            />
          </box>

          <box style={{ marginTop: 1 }}>
            <text fg={theme.muted}>
              <span>Monitored sensors: </span>
              <span fg={theme.accent} attributes={TextAttributes.BOLD}>
                {status.sensors.length}
              </span>
              <span> sensors discovered via IOHID & SMC</span>
            </text>
          </box>
        </box>

        {/* Controller Health Card */}
        <box
          style={{
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
              <span fg={theme.accent}>🔰 </span>
              <span fg={theme.fg}>Controller Health & Guardian</span>
            </text>
          </box>

          <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <text fg={theme.muted}>🟢 Status:</text>
            <text fg={theme.tempCool} attributes={TextAttributes.BOLD}>
              ● ACTIVE (PID {status.pid})
            </text>
          </box>

          <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <text fg={theme.muted}>Mode:</text>
            <text
              fg={status.mode === "manual" ? theme.fanManual : theme.fanAuto}
              attributes={TextAttributes.BOLD}
            >
              {status.mode === "manual" ? "MANUAL OVERRIDE" : "DYNAMIC CURVE (AUTO)"}
            </text>
          </box>

          <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <text fg={theme.muted}>🚨 Emergency Cutoff:</text>
            <text fg={theme.tempCritical} attributes={TextAttributes.BOLD}>
              {status.emergencyTemperatureC}°C (Max Fan Speed)
            </text>
          </box>

          <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <text fg={theme.muted}>Uptime:</text>
            <text fg={theme.fg}>{uptimeStr}</text>
          </box>

          <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <text fg={theme.muted}>🔐 Hardware Access:</text>
            <text
              fg={status.privileged === false ? theme.tempWarm : theme.tempCool}
              attributes={TextAttributes.BOLD}
            >
              {status.privileged === false ? "Read-Only (Unprivileged)" : "Root / Privileged"}
            </text>
          </box>

          {status.error ? (
            <box style={{ marginTop: 1 }}>
              <text fg={theme.tempWarm}>⚠ {status.error}</text>
            </box>
          ) : null}
        </box>
      </box>
    </box>
  );
};
