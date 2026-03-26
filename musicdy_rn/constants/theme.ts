/**
 * Musicdy Design Tokens — Stitch
 * Gold-on-black brand palette extracted from Google Stitch designs.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#FFD700',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#FFD700',
  },
  dark: {
    text: '#F1F5F9',
    background: '#000000',
    tint: '#FFD700',
    icon: '#64748B',
    tabIconDefault: '#64748B',
    tabIconSelected: '#FFD700',
  },
};

// Stitch Brand Tokens
export const StitchColors = {
  primary: '#FFD700',       // Gold
  primaryAlt: '#FFD131',
  neonYellow: '#CCFF00',
  neonGreen: '#39FF14',
  feedGold: '#FFD900',

  bg: '#000000',
  card: '#0F0F0F',
  cardAlt: '#161616',
  surface: '#1A1A1A',

  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  borderSubtle: 'rgba(255,255,255,0.05)',
  borderLight: 'rgba(255,255,255,0.10)',
  borderSlate: '#1E293B',
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
