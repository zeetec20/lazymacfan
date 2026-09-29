import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";
import { useTerminalSize } from "../useTerminalSize";

export const Footer = () => {
  const theme = useTheme();
  const { columns, isCompactWidth } = useTerminalSize();

  const hints = [
    { key: "1-4", label: "tabs" },
    { key: "m", label: isCompactWidth ? "mode" : "auto/manual" },
    { key: "←/→", label: isCompactWidth ? "rpm" : "rpm ±500" },
    { key: "T", label: "theme" },
    ...(isCompactWidth ? [] : [{ key: "r", label: "refresh" }]),
    { key: "?", label: "help" },
    ...(isCompactWidth ? [] : [{ key: "q", label: "quit" }]),
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
      {columns >= 90 ? (
        <box style={{ flexDirection: "row" }}>
          <text fg={theme.muted}>
            <span>lazymacfan 🌀</span>
          </text>
        </box>
      ) : null}
    </box>
  );
};
