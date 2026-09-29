import { useEffect, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";

const ART = [
  "  _      _   ________  __",
  " | |    / \\ |__  /\\ \\ / /",
  " | |   / _ \\  / /  \\ V / ",
  " | |__/ ___ \\/ /_   | |  ",
  " |____/_/   \\____/  |_|  ",
  " ───  M A C  F A N  ───  ",
];

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const WIDTH = Math.max(...ART.map((r) => r.length));
const ROWS = ART.map((r) => r.padEnd(WIDTH, " "));
const WINDOW = 8; // width of highlight sweep
const SPEED = 65; // ms per sweep frame

export const Wordmark = ({ compact = false }: { compact?: boolean }) => {
  const theme = useTheme();
  const [pos, setPos] = useState(0);
  const [spinnerIndex, setSpinnerIndex] = useState(0);

  useEffect(() => {
    const sweepTimer = setInterval(() => {
      setPos((p) => (p + 1) % (WIDTH + WINDOW + 6));
    }, SPEED);

    const spinTimer = setInterval(() => {
      setSpinnerIndex((s) => (s + 1) % SPINNER_FRAMES.length);
    }, 100);

    return () => {
      clearInterval(sweepTimer);
      clearInterval(spinTimer);
    };
  }, []);

  const spinner = SPINNER_FRAMES[spinnerIndex];

  if (compact) {
    return (
      <box
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <text fg={theme.accent}>
          <span attributes={TextAttributes.BOLD}>{spinner} 🌀</span>
        </text>
        <text>
          <span fg={theme.accent} attributes={TextAttributes.BOLD}>
            LAZYMACFAN
          </span>
          <span fg={theme.muted}> — macOS dynamic fan controller</span>
        </text>
      </box>
    );
  }

  return (
    <box style={{ flexDirection: "column", alignItems: "center", paddingTop: 1, paddingBottom: 1 }}>
      {ROWS.map((row, r) => (
        <box key={r} style={{ flexDirection: "row" }}>
          <text>
            {row.split("").map((ch, c) => {
              const d = pos - c;
              const lit = d >= 0 && d < WINDOW;
              return (
                <span
                  key={c}
                  fg={lit ? theme.accent : theme.muted}
                  attributes={lit && d < 4 ? TextAttributes.BOLD : undefined}
                >
                  {ch}
                </span>
              );
            })}
          </text>
        </box>
      ))}
      <box style={{ flexDirection: "row", marginTop: 1, gap: 1 }}>
        <text fg={theme.accent}>
          <span attributes={TextAttributes.BOLD}>{spinner}</span>
        </text>
        <text fg={theme.muted}>macOS dynamic fan controller</text>
      </box>
    </box>
  );
};
