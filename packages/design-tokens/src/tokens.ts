import tokensJson from './tokens.json';

export interface ColorPalette {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryBright: string;
  cyan: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface DesignTokens {
  name: string;
  typography: {
    primary: string;
    technical: string;
    fallback: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  spacing: {
    '2xs': number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };
  breakpoints: {
    mobileMax: number;
    tabletMin: number;
    tabletMax: number;
    desktopMin: number;
    wideDesktopMin: number;
  };
  dark: ColorPalette;
  light: ColorPalette;
  semantic: {
    healthy: keyof ColorPalette;
    waiting: keyof ColorPalette;
    critical: keyof ColorPalette;
    aiAction: keyof ColorPalette;
    liveCommunication: keyof ColorPalette;
    inProgress: keyof ColorPalette;
  };
  motion: {
    fastMs: number;
    normalMs: number;
    workflowMs: number;
  };
  shell: {
    desktopSidebarPx: number;
    tabletRailPx: number;
    topbarPx: number;
    mobileTopbarPx: number;
    mobileBottomNavPx: number;
  };
}

export const DESIGN_TOKENS: DesignTokens = tokensJson as DesignTokens;

export type ThemeMode = 'light' | 'dark';

export function getThemeColors(mode: ThemeMode): ColorPalette {
  return mode === 'dark' ? DESIGN_TOKENS.dark : DESIGN_TOKENS.light;
}
