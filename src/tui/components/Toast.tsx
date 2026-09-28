import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";

export function Toast({ message }: { message: string | null }) {
  const theme = useTheme();

  if (!message) return null;

  return (
    <box
      style={{
        position: "absolute",
        bottom: 2,
        right: 2,
        borderStyle: "rounded",
        borderColor: theme.accent,
        backgroundColor: theme.selectedBg,
        paddingLeft: 2,
        paddingRight: 2,
        paddingTop: 0,
        paddingBottom: 0,
      }}
    >
      <text fg={theme.accent}>
        <span attributes={TextAttributes.BOLD}>⚡ </span>
        <span fg={theme.fg}>{message}</span>
      </text>
    </box>
  );
}
