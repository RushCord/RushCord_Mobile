export const Colors = {
  // Discord-inspired palette
  primary: "#5865F2",
  primaryDark: "#4752C4",

  background: "#36393F",
  backgroundSecondary: "#2F3136",
  backgroundTertiary: "#202225",

  surface: "#40444B",
  surfaceHover: "#4F545C",

  text: "#DCDDDE",
  textMuted: "#72767D",
  textHeader: "#FFFFFF",

  success: "#43B581",
  danger: "#F04747",
  warning: "#FAA61A",

  online: "#43B581",
  idle: "#FAA61A",
  dnd: "#F04747",
  offline: "#747F8D",

  border: "#202225",
  divider: "#40444B",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  heading: 28,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
} as const;
