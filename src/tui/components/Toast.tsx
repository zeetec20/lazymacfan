import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";

export type ToastKind = "success" | "warning" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  kind?: ToastKind;
}

const getToastMeta = (kind: ToastKind, theme: ReturnType<typeof useTheme>) => {
  if (kind === "success") return { color: theme.tempCool, icon: "✓" };
  if (kind === "warning") return { color: theme.tempWarm, icon: "⚠" };
  if (kind === "error") return { color: theme.tempCritical, icon: "✗" };
  return { color: theme.accent, icon: "ℹ" };
};

export const ToastCard = ({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss?: (id: string) => void;
}) => {
  const theme = useTheme();
  const kind = toast.kind ?? "info";
  const { color, icon } = getToastMeta(kind, theme);

  return (
    <box
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderStyle: "rounded",
        borderColor: color,
        backgroundColor: theme.bg,
        paddingLeft: 2,
        paddingRight: 2,
        gap: 2,
      }}
    >
      <text>
        <span fg={color} attributes={TextAttributes.BOLD}>
          {icon}
        </span>
        <span fg={theme.fg}> {toast.message} </span>
      </text>
      <box onMouseDown={() => onDismiss?.(toast.id)}>
        <text fg={theme.muted}>
          <span fg={theme.muted}>[</span>
          <span fg={theme.accent} attributes={TextAttributes.BOLD}>
            x
          </span>
          <span fg={theme.muted}> close]</span>
        </text>
      </box>
    </box>
  );
};

export const ToastStack = ({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss?: (id: string) => void;
}) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <box
      style={{
        position: "absolute",
        bottom: 2,
        right: 2,
        zIndex: 100,
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1,
      }}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </box>
  );
};

export const Toast = ({
  toast,
  onDismiss,
}: {
  toast: ToastItem | null;
  onDismiss?: (id: string) => void;
}) => {
  if (!toast) return null;
  return <ToastStack toasts={[toast]} onDismiss={onDismiss} />;
};
