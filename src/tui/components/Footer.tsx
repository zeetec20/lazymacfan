import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";

export function Footer() {
  const theme = useTheme();

  const hints = [
    { key: "1-5", label: "tabs" },
    { key: "m", label: "auto/manual" },
    { key: "←/→", label: "rpm ±100" },
    { key: "T", label: "theme" },
    { key: "r", label: "refresh" },
    { key: "?", label: "help" },
    { key: "q", label: "quit" },
  ];

  return (
    <box
      style={{
        flexDirection: "row",
        borderStyle: "rounded",
        borderColor: theme.border,
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 0,
        paddingBottom: 0,
        flexShrink: 0,
        justifyContent: "space-between",
      }}
    >
      <box style={{ flexDirection: "row", gap: 1 }}>
        {hints.map((h) => (
          <box key={h.key} style={{ flexDirection: "row" }}>
            <text>
              <span fg={theme.accent} attributes={TextAttributes.BOLD}>
                [{h.key}]
              </span>
              <span fg={theme.muted}> {h.label} </span>
            </text>
          </box>
        ))}
      </box>
      <box style={{ flexDirection: "row" }}>
        <text fg={theme.muted}>
          <span>lazymacfan 🌀</span>
        </text>
      </box>
    </box>
  );
}
