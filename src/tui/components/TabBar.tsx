import { TextAttributes } from "@opentui/core";
import { useTheme } from "../ThemeContext";
import type { ControllerStatus } from "../../types/controller";

export interface TabItem {
  key: string;
  num: string;
  label: string;
  badge?: string | number;
}

export const TabBar = ({
  tabs,
  activeTab,
  onSelectTab,
  status,
}: {
  tabs: TabItem[];
  activeTab: number;
  onSelectTab: (idx: number) => void;
  status: ControllerStatus | null;
}) => {
  const theme = useTheme();

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
              onMouseUp={() => onSelectTab(idx)}
              style={{
                flexDirection: "row",
              }}
            >
              {isActive ? (
                <text>
                  <span fg={theme.selectedBg}></span>
                  <span fg={theme.accent} bg={theme.selectedBg} attributes={TextAttributes.BOLD}>
                    <span>[{tab.num}] </span>
                    <span>{tab.label}</span>
                    {tab.badge !== undefined ? <span> ({tab.badge})</span> : null}
                  </span>
                  <span fg={theme.selectedBg}></span>
                </text>
              ) : (
                <text fg={theme.muted}>
                  <span> [{tab.num}] </span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined ? <span> ({tab.badge})</span> : null}
                  <span> </span>
                </text>
              )}
            </box>
          );
        })}
      </box>

      {/* Fan / Controller Live Status in place of clock */}
      <box style={{ flexDirection: "row", alignItems: "center" }}>
        {!status ? (
          <text fg={theme.muted}>Connecting...</text>
        ) : status.privileged === false ? (
          <text>
            <span fg={theme.tempWarm} attributes={TextAttributes.BOLD}>
              🔒 READ-ONLY
            </span>
            <span fg={theme.muted}> (No Permission)</span>
          </text>
        ) : status.mode === "manual" ? (
          <text>
            <span fg={theme.fanManual} attributes={TextAttributes.BOLD}>
              ● MANUAL
            </span>
            <span fg={theme.muted}> ({Math.round(status.fans[0]?.currentRpm ?? 0)} RPM)</span>
          </text>
        ) : (
          <text>
            <span fg={theme.fanAuto} attributes={TextAttributes.BOLD}>
              ○ AUTO
            </span>
            <span fg={theme.muted}> (Thermal Curve)</span>
          </text>
        )}
      </box>
    </box>
  );
};
