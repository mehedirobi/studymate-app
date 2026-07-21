/**
 * theme.js
 * Centralized design tokens for StudyMate.
 * Import this anywhere instead of hardcoding hex values / spacing numbers,
 * so the whole app stays visually consistent and is trivial to re-skin
 * (e.g. dark mode) later.
 */

export const colors = {
  // Brand
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primarySoft: "#eff6ff",
  gradientStart: "#2563eb",
  gradientEnd: "#4f46e5",

  // Surfaces
  bg: "#f8fafc",
  surface: "#ffffff",
  surfaceMuted: "#f1f5f9",
  border: "#e2e8f0",

  // Text
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  textOnPrimary: "#ffffff",
  textOnPrimarySoft: "#dbeafe",

  // Status
  success: "#16a34a",
  successBg: "#f0fdf4",
  warning: "#d97706",
  warningBg: "#fffbeb",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  dangerBorder: "#fecaca",
  info: "#2563eb",
  infoBg: "#eff6ff",
  pending: "#f97316",
  pendingBg: "#fff7ed",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const type = {
  display: { fontSize: 28, fontWeight: "800", letterSpacing: -0.4 },
  title: { fontSize: 19, fontWeight: "800", letterSpacing: -0.2 },
  subtitle: { fontSize: 14, fontWeight: "500" },
  body: { fontSize: 15, fontWeight: "500" },
  label: { fontSize: 13, fontWeight: "700" },
  caption: { fontSize: 12, fontWeight: "600" },
  tiny: { fontSize: 10, fontWeight: "700" },
};

// Soft, modern elevation — lower opacity + larger radius reads as
// "premium" vs. harsh default RN shadows.
export const shadow = {
  sm: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  colored: (hex) => ({
    shadowColor: hex,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  }),
};

// Simple responsive breakpoints — extend as new screens need them.
export const breakpoints = {
  small: 360, // compact phones (iPhone SE etc.)
  tablet: 768,
};

export function getResponsiveMetrics(width) {
  const isSmall = width < breakpoints.small;
  const isTablet = width >= breakpoints.tablet;
  return {
    isSmall,
    isTablet,
    horizontalPadding: isTablet ? 32 : isSmall ? 16 : 20,
    maxContentWidth: isTablet ? 900 : undefined,
    columns: isTablet ? 2 : 1,
  };
}