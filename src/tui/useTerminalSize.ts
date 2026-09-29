import { useEffect, useState } from "react";

export interface TerminalSize {
  columns: number;
  rows: number;
  isSmallScreen: boolean;
  isCompactHeight: boolean;
  isCompactWidth: boolean;
}

export const useTerminalSize = (): TerminalSize => {
  const [size, setSize] = useState({
    columns: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  });

  useEffect(() => {
    const onResize = () => {
      setSize({
        columns: process.stdout.columns ?? 80,
        rows: process.stdout.rows ?? 24,
      });
    };

    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, []);

  return {
    columns: size.columns,
    rows: size.rows,
    isSmallScreen: size.columns < 95 || size.rows < 28,
    isCompactHeight: size.rows < 28,
    isCompactWidth: size.columns < 95,
  };
};
