import { useTerminalDimensions } from "@opentui/react";

export interface TerminalSize {
  columns: number;
  rows: number;
  isSmallScreen: boolean;
  isCompactHeight: boolean;
  isCompactWidth: boolean;
}

export const useTerminalSize = (): TerminalSize => {
  const dims = useTerminalDimensions();
  const columns = dims?.width && dims.width > 0 ? dims.width : (process.stdout.columns ?? 80);
  const rows = dims?.height && dims.height > 0 ? dims.height : (process.stdout.rows ?? 24);

  return {
    columns,
    rows,
    isSmallScreen: columns < 95 || rows < 28,
    isCompactHeight: rows < 28,
    isCompactWidth: columns < 95,
  };
};
