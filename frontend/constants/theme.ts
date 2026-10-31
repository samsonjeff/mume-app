export const THEME = {
  colors: {
    // Strict 4-color palette
    bg: '#F2F0EF',           // Soft Alabaster (canvas & base background)
    card: '#F5F5DC',         // Warm Beige (card surface, badge containers)
    primaryLight: '#98CFF0', // Soft Sky Blue (active highlights, pulse glow rings)
    primary: '#82C8E5',       // Cerulean Sky (primary CTA, wake base, borders)
    cardBorder: '#82C8E5',   // Accent border

    // Complementary text colors for WCAG high-contrast legibility
    text: '#1E293B',         // Deep slate on light alabaster/beige
    textMuted: '#475569',    // Complementary slate for helper text
    textInverted: '#0F172A', // Deep navy for text inside blue action buttons

    // Semantic status states
    listening: '#EF4444',
    speaking: '#10B981',
    pending: '#82C8E5',
    danger: '#EF4444',
  },
  ergonomics: {
    minTapTarget: 48,
    buttonSpacing: 8,
    wakeButtonSize: 72,
    wakeButtonMarginBottom: 72,
    thumbZoneBottomPercent: 0.4,
  },
};
