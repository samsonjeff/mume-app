export const THEME = {
  // Official Google Antigravity (https://antigravity.google/) Design System Palette
  palette: {
    grey0: '#FFFFFF',
    grey10: '#F8F9FC',
    grey15: '#F0F1F5',
    grey20: '#EFF2F7',
    grey50: '#E6EAF0',
    grey100: '#E1E6EC',
    grey200: '#CDD4DC',
    grey300: '#B2BBC5',
    grey400: '#B7BFD9',
    grey800: '#45474D',
    grey900: '#2F3034',
    grey1000: '#212226',
    grey1100: '#18191D',
    grey1200: '#121317',
    blue600: '#3279F9',
    googleBlue: '#1A73E8',
    googleBlueHover: '#1557B0',
    skyBlue: '#749BFF',
    lightBlue: '#8AB4F8',
    green: '#00B95C',
    amber: '#FBBC04',
    yellow: '#FFE432',
    red: '#FC413D',
  },
  colors: {
    // Surfaces (--theme-surface-*)
    bg: '#F8F9FC',             // --palette-grey-10 (Surface Container / Cool Alabaster Canvas)
    surface: '#FFFFFF',        // --palette-grey-0 (Pure White Surface)
    card: '#FFFFFF',           // Pure white cards over #F8F9FC canvas
    cardElevated: '#EFF2F7',   // --palette-grey-20 (--theme-surface-surface-container-high)
    cardHigher: '#E6EAF0',     // --palette-grey-50 (--theme-surface-surface-container-higher)
    cardBorder: '#E1E6EC',     // --palette-grey-100 / --theme-outline
    outlineVariant: 'rgba(33, 34, 38, 0.08)',

    // Brand & Interactive (--theme-primary-* & --palette-blue-600)
    primary: '#3279F9',        // --palette-blue-600 (Antigravity Electric Blue)
    primaryDark: '#1A73E8',    // Google Blue CTA
    primaryLight: '#E6EAF0',   // --palette-grey-50 (Tonal pill / secondary surface)
    primaryTint: 'rgba(50, 121, 249, 0.10)',
    obsidian: '#121317',       // --palette-grey-1200 (Antigravity primary pill button bg)

    // Typography (--theme-surface-on-surface*)
    text: '#121317',           // --palette-grey-1200 (--theme-surface-on-surface)
    textMuted: '#45474D',      // --palette-grey-800 (--theme-surface-on-surface-variant)
    textSubtle: '#676A72',     // Secondary caption / disabled text
    textInverted: '#FFFFFF',   // --palette-grey-0 (--theme-primary-on-primary)

    // Semantic Status States (Antigravity Spectrum)
    listening: '#121317',      // Obsidian Black (Antigravity primary action)
    speaking: '#00B95C',       // Antigravity Emerald Green
    pending: '#FBBC04',        // Antigravity Amber
    danger: '#FC413D',
  },
  ergonomics: {
    minTapTarget: 48,
    buttonSpacing: 8,
    wakeButtonSize: 72,
    wakeButtonMarginBottom: 72,
    thumbZoneBottomPercent: 0.4,
  },
};
