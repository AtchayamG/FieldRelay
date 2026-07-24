import { describe, it, expect } from 'vitest';
import { DESIGN_TOKENS, getThemeColors } from './tokens';

describe('Design Tokens', () => {
  it('loads canonical tokens properly', () => {
    expect(DESIGN_TOKENS.name).toBe('FieldRelay Neon Ops Enterprise');
    expect(DESIGN_TOKENS.radius.lg).toBe(18);
    expect(DESIGN_TOKENS.shell.desktopSidebarPx).toBe(270);
  });

  it('returns appropriate color palettes for light and dark theme', () => {
    const light = getThemeColors('light');
    const dark = getThemeColors('dark');

    expect(light.bg).toBe('#F4F7FC');
    expect(dark.bg).toBe('#070A13');
    expect(light.primary).toBe('#6D28D9');
    expect(dark.primary).toBe('#7C3AED');
  });
});
