import { useTheme } from "../ThemeContext";

export function Gauge({
  value,
  min = 0,
  max = 100,
  width = 16,
  isTemperature = false,
  showPercentage = true,
}: {
  value: number;
  min?: number;
  max?: number;
  width?: number;
  isTemperature?: boolean;
  showPercentage?: boolean;
}) {
  const theme = useTheme();
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const filledCount = Math.round(ratio * width);
  const emptyCount = Math.max(0, width - filledCount);

  let barColor = theme.accent;
  if (isTemperature) {
    if (value < 50) {
      barColor = theme.tempCool;
    } else if (value < 70) {
      barColor = theme.tempWarm;
    } else if (value < 85) {
      barColor = theme.tempHot;
    } else {
      barColor = theme.tempCritical;
    }
  }

  const filledStr = "▰".repeat(filledCount);
  const emptyStr = "▱".repeat(emptyCount);
  const pct = Math.round(ratio * 100);

  return (
    <box style={{ flexDirection: "row", alignItems: "center" }}>
      <text>
        <span fg={barColor}>{filledStr}</span>
        <span fg={theme.border}>{emptyStr}</span>
      </text>
      {showPercentage ? (
        <text fg={theme.muted}>
          <span> {pct.toString().padStart(3)}%</span>
        </text>
      ) : null}
    </box>
  );
}
