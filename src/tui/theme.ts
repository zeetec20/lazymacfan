export interface Theme {
  name: string;
  bg?: string;
  fg: string;
  border: string;
  accent: string;
  muted: string;
  selectedBg: string;
  selectedFg: string;
  tempCool: string;
  tempWarm: string;
  tempHot: string;
  tempCritical: string;
  fanAuto: string;
  fanManual: string;
}

export const THEME_NAMES = [
  "tokyonight",
  "catppuccin",
  "nord",
  "obsidian",
  "gruvbox",
  "one-dark",
  "everforest",
  "matrix",
] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

const pal = (
  bg: string,
  fg: string,
  border: string,
  accent: string,
  muted: string,
  selectedBg: string,
  selectedFg: string,
  tempCool: string,
  tempWarm: string,
  tempHot: string,
  tempCritical: string,
  fanAuto: string,
  fanManual: string,
): Omit<Theme, "name"> => ({
  bg,
  fg,
  border,
  accent,
  muted,
  selectedBg,
  selectedFg,
  tempCool,
  tempWarm,
  tempHot,
  tempCritical,
  fanAuto,
  fanManual,
});

const PALETTES: Record<ThemeName, { dark: Omit<Theme, "name">; light: Omit<Theme, "name"> }> = {
  tokyonight: {
    dark: pal(
      "#1a1b26",
      "#c0caf5",
      "#414868",
      "#7aa2f7",
      "#565f89",
      "#283457",
      "#c0caf5",
      "#73daca",
      "#e0af68",
      "#ff9e64",
      "#f7768e",
      "#7aa2f7",
      "#bb9af7",
    ),
    light: pal(
      "#e1e2e7",
      "#3760bf",
      "#a8aecb",
      "#2e7de9",
      "#8990b3",
      "#b7c1e3",
      "#3760bf",
      "#388a7b",
      "#8c6c3e",
      "#b15c00",
      "#c64343",
      "#2e7de9",
      "#9854f1",
    ),
  },
  catppuccin: {
    dark: pal(
      "#1e1e2e",
      "#cdd6f4",
      "#45475a",
      "#cba6f7",
      "#6c7086",
      "#313244",
      "#cdd6f4",
      "#a6e3a1",
      "#f9e2af",
      "#fab387",
      "#f38ba8",
      "#89b4fa",
      "#cba6f7",
    ),
    light: pal(
      "#eff1f5",
      "#4c4f69",
      "#ccd0da",
      "#8839ef",
      "#9ca0b0",
      "#dce0e8",
      "#4c4f69",
      "#40a02b",
      "#df8e1d",
      "#fe640b",
      "#d20f39",
      "#1e66f5",
      "#8839ef",
    ),
  },
  nord: {
    dark: pal(
      "#2e3440",
      "#d8dee9",
      "#434c5e",
      "#88c0d0",
      "#616e88",
      "#3b4252",
      "#eceff4",
      "#a3be8c",
      "#ebcb8b",
      "#d08770",
      "#bf616a",
      "#81a1c1",
      "#b48ead",
    ),
    light: pal(
      "#eceff4",
      "#2e3440",
      "#d8dee9",
      "#5e81ac",
      "#7b88a1",
      "#d8dee9",
      "#2e3440",
      "#5a8a4a",
      "#b48a00",
      "#c35d00",
      "#a8333f",
      "#5e81ac",
      "#9d6fa0",
    ),
  },
  obsidian: {
    dark: pal(
      "#1e1e1e",
      "#dcddde",
      "#3b3b3b",
      "#a882ff",
      "#7a7a7a",
      "#483699",
      "#ffffff",
      "#9ece6a",
      "#e0af68",
      "#ff9e64",
      "#f7768e",
      "#7aa2f7",
      "#a882ff",
    ),
    light: pal(
      "#ffffff",
      "#1e1e1e",
      "#d4d4d4",
      "#7c3aed",
      "#9a9a9a",
      "#d8c9ff",
      "#1e1e1e",
      "#3f9142",
      "#b8860b",
      "#d97706",
      "#dc2626",
      "#3b82f6",
      "#7c3aed",
    ),
  },
  gruvbox: {
    dark: pal(
      "#282828",
      "#ebdbb2",
      "#504945",
      "#fabd2f",
      "#928374",
      "#3c3836",
      "#ebdbb2",
      "#b8bb26",
      "#fabd2f",
      "#fe8019",
      "#fb4934",
      "#83a598",
      "#d3869b",
    ),
    light: pal(
      "#fbf1c7",
      "#3c3836",
      "#d5c4a1",
      "#b57614",
      "#a89984",
      "#ebdbb2",
      "#3c3836",
      "#79740e",
      "#b57614",
      "#af3a03",
      "#9d0006",
      "#076678",
      "#8f3f71",
    ),
  },
  "one-dark": {
    dark: pal(
      "#282c34",
      "#abb2bf",
      "#3e4451",
      "#61afef",
      "#5c6370",
      "#3e4451",
      "#abb2bf",
      "#98c379",
      "#e5c07b",
      "#d19a66",
      "#e06c75",
      "#61afef",
      "#c678dd",
    ),
    light: pal(
      "#fafafa",
      "#383a42",
      "#d4d4d4",
      "#4078f2",
      "#a0a1a7",
      "#e5e5e6",
      "#383a42",
      "#50a14f",
      "#c18401",
      "#b25000",
      "#e45649",
      "#4078f2",
      "#a626a4",
    ),
  },
  everforest: {
    dark: pal(
      "#2d353b",
      "#d3c6aa",
      "#475258",
      "#a7c080",
      "#859289",
      "#475258",
      "#d3c6aa",
      "#a7c080",
      "#dbbc7f",
      "#e69875",
      "#e67e80",
      "#7fbbb3",
      "#d699b6",
    ),
    light: pal(
      "#fdf6e3",
      "#5c6a72",
      "#e0dcc7",
      "#8da101",
      "#a6b0a0",
      "#e6e2cc",
      "#5c6a72",
      "#8da101",
      "#dfa000",
      "#f57d26",
      "#f85552",
      "#3a94c5",
      "#df69ba",
    ),
  },
  matrix: {
    dark: pal(
      "#000000",
      "#00ff00",
      "#003b00",
      "#00ff66",
      "#008f11",
      "#003b00",
      "#00ff00",
      "#00ff66",
      "#39ff14",
      "#76ff03",
      "#ff0055",
      "#00ffaa",
      "#00e676",
    ),
    light: pal(
      "#e8ffe8",
      "#003b00",
      "#9fdf9f",
      "#008f11",
      "#4f8f4f",
      "#bff0bf",
      "#003b00",
      "#008f11",
      "#3a8f00",
      "#689f38",
      "#d32f2f",
      "#008f5a",
      "#00796b",
    ),
  },
};

export const detectSystemMode = (): "light" | "dark" => {
  if (process.platform !== "darwin") return "dark";
  try {
    const out = Bun.spawnSync(["defaults", "read", "-g", "AppleInterfaceStyle"]);
    return out.stdout.toString().trim() === "Dark" ? "dark" : "light";
  } catch {
    return "dark";
  }
};

export const resolveTheme = (name?: string, mode?: "auto" | "light" | "dark"): Theme => {
  const key = (THEME_NAMES.includes(name as ThemeName) ? name : "tokyonight") as ThemeName;
  const sysMode = detectSystemMode();
  const variant = (mode ?? "auto") === "auto" ? sysMode : (mode as "light" | "dark");
  const palette = PALETTES[key]?.[variant] ?? PALETTES.tokyonight.dark;
  return { name: key, ...palette };
};
