import { useEffect, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";

export interface TabItem {
  key: string;
  num: string;
  label: string;
  badge?: string | number;
}

export function TabBar({
  tabs,
  activeTab,
  onSelectTab,
}: {
  tabs: TabItem[];
  activeTab: number;
  onSelectTab: (idx: number) => void;
}) {
  const theme = useTheme();
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(" ")[0] ?? "");
    };
    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <box
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        borderStyle: "rounded",
        borderColor: theme.border,
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 0,
        paddingBottom: 0,
        flexShrink: 0,
      }}
    >
      <box style={{ flexDirection: "row", gap: 1 }}>
        {tabs.map((tab, idx) => {
          const isActive = idx === activeTab;
          return (
            <box
              key={tab.key}
              onMouseDown={() => onSelectTab(idx)}
              style={{
                flexDirection: "row",
                backgroundColor: isActive ? theme.selectedBg : undefined,
                paddingLeft: 1,
                paddingRight: 1,
              }}
            >
              <text
                fg={isActive ? theme.accent : theme.muted}
                attributes={isActive ? TextAttributes.BOLD : undefined}
              >
                {isActive ? "▌ " : "  "}
                <span fg={theme.muted}>[{tab.num}] </span>
                {tab.label}
                {tab.badge !== undefined ? (
                  <span fg={isActive ? theme.fg : theme.muted}> ({tab.badge})</span>
                ) : null}
              </text>
            </box>
          );
        })}
      </box>

      <box style={{ flexDirection: "row", alignItems: "center" }}>
        <text fg={theme.muted}>
          <span>🕒 </span>
          <span fg={theme.fg}>{timeStr}</span>
        </text>
      </box>
    </box>
  );
}
