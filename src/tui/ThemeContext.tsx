import { createContext, useContext } from "react";
import { resolveTheme, type Theme } from "./theme";

const ThemeContext = createContext<Theme>(resolveTheme("tokyonight"));

export const ThemeProvider = ThemeContext.Provider;

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
