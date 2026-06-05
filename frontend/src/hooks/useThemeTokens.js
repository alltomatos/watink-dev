import { useMemo } from "react";

export const TOKEN_MAP = {
  // Backgrounds
  "bg-default": "var(--bg-default)",
  "bg-surface": "var(--bg-surface)",
  "bg-surface-alt": "var(--bg-surface-alt)",
  "bg-sidebar": "var(--bg-sidebar)",
  "bg-appbar": "var(--bg-appbar)",
  "bg-content": "var(--bg-content)",

  // Text
  "text-primary": "var(--text-primary)",
  "text-secondary": "var(--text-secondary)",
  "text-muted": "var(--text-muted)",
  "text-inverse": "var(--text-inverse)",
  "text-sidebar": "var(--text-sidebar)",
  "text-appbar": "var(--text-appbar)",

  // Action
  "action-primary": "var(--action-primary)",
  "action-primary-hover": "var(--action-primary-hover)",
  "action-primary-bg": "var(--action-primary-bg)",
  "action-primary-active": "var(--action-primary-active)",

  // Status — text/icon
  "status-success": "var(--status-success)",
  "status-error": "var(--status-error)",
  "status-warning": "var(--status-warning)",
  "status-info": "var(--status-info)",

  // Status — chip backgrounds
  "status-success-bg": "var(--status-success-bg)",
  "status-success-text": "var(--status-success-text)",
  "status-error-bg": "var(--status-error-bg)",
  "status-error-text": "var(--status-error-text)",
  "status-warning-bg": "var(--status-warning-bg)",
  "status-warning-text": "var(--status-warning-text)",
  "status-info-bg": "var(--status-info-bg)",
  "status-info-text": "var(--status-info-text)",
  "status-default-bg": "var(--status-default-bg)",
  "status-default-text": "var(--status-default-text)",

  // Status opaques
  "status-success-10": "var(--status-success-10)",
  "status-error-10": "var(--status-error-10)",
  "status-info-4": "var(--status-info-4)",
  "status-info-8": "var(--status-info-8)",
  "status-info-15": "var(--status-info-15)",
  "status-info-30": "var(--status-info-30)",
  "status-info-40": "var(--status-info-40)",

  // Border
  "border-default": "var(--border-default)",
  "border-subtle": "var(--border-subtle)",
  "border-strong": "var(--border-strong)",
  "border-sidebar": "var(--border-sidebar)",
  "border-appbar": "var(--border-appbar)",
  "border-divider": "var(--border-divider)",
  "border-weak": "var(--border-weak)",
  "border-logo-divider": "var(--border-logo-divider)",

  // Overlay
  "overlay-light": "var(--overlay-light)",
  "overlay-medium": "var(--overlay-medium)",
  "overlay-strong": "var(--overlay-strong)",
  "overlay-dark": "var(--overlay-dark)",
  "overlay-dark-medium": "var(--overlay-dark-medium)",
  "overlay-dark-strong": "var(--overlay-dark-strong)",
  "overlay-weak": "var(--overlay-weak)",

  // Shadow
  "shadow-sm": "var(--shadow-sm)",
  "shadow-md": "var(--shadow-md)",
  "shadow-lg": "var(--shadow-lg)",
  "shadow-xl": "var(--shadow-xl)",
  "shadow-sidebar-glow": "var(--shadow-sidebar-glow)",
  "shadow-appbar": "var(--shadow-appbar)",
  "shadow-light": "var(--shadow-light)",
  "shadow-medium": "var(--shadow-medium)",
  "shadow-strong": "var(--shadow-strong)",

  // Radius (components)
  "radius-sm": "var(--radius-sm)",
  "radius-md": "var(--radius-md)",
  "radius-lg": "var(--radius-lg)",
  "radius-xl": "var(--radius-xl)",
  "radius-full": "var(--radius-full)",

  // Spacing (components)
  "spacing-xs": "var(--spacing-xs)",
  "spacing-sm": "var(--spacing-sm)",
  "spacing-md": "var(--spacing-md)",
  "spacing-lg": "var(--spacing-lg)",
  "spacing-xl": "var(--spacing-xl)",

  // Card (components)
  "card-bg": "var(--card-bg)",
  "card-border-radius": "var(--card-border-radius)",
  "card-shadow": "var(--card-shadow)",
  "card-padding": "var(--card-padding)",
  "card-gap": "var(--card-gap)",
  "card-hover-transform": "var(--card-hover-transform)",

  // Button (components)
  "button-primary-bg": "var(--button-primary-bg)",
  "button-primary-text": "var(--button-primary-text)",
  "button-secondary-bg": "var(--button-secondary-bg)",
  "button-outline-border": "var(--button-outline-border)",
  "button-danger-bg": "var(--button-danger-bg)",
  "button-sm-padding": "var(--button-sm-padding)",
  "button-lg-padding": "var(--button-lg-padding)",
  "button-radius": "var(--button-radius)",

  // Input (components)
  "input-padding": "var(--input-padding)",
  "input-radius": "var(--input-radius)",
  "input-error-border": "var(--input-error-border)",

  // Navigation (components)
  "nav-item-height": "var(--nav-item-height)",
  "nav-item-radius": "var(--nav-item-radius)",
  "nav-item-hover-bg": "var(--nav-item-hover-bg)",
  "nav-active-bg": "var(--nav-active-bg)",
  "nav-active-text": "var(--nav-active-text)",

  // App Structure (components)
  "sidebar-width": "var(--sidebar-width)",
  "sidebar-bg": "var(--sidebar-bg)",
  "appbar-height": "var(--appbar-height)",
  "appbar-bg": "var(--appbar-bg)",

  // Motion
  "ease-out": "var(--ease-out)",
  "duration-normal": "var(--duration-normal)",

  // Message bubbles
  "message-left-bg": "var(--message-left-bg)",
  "message-right-bg": "var(--message-right-bg)",
  "message-left-text": "var(--message-left-text)",
  "message-right-text": "var(--message-right-text)",
  "message-quote-bg": "var(--message-quote-bg)",
  "message-quote-text": "var(--message-quote-text)",
  "message-quote-border": "var(--message-quote-border)",
  "message-quote-side-left": "var(--message-quote-side-left)",
  "message-quote-side-right": "var(--message-quote-side-right)",
  "message-timestamp-text": "var(--message-timestamp-text)",
  "message-daily-bg": "var(--message-daily-bg)",
  "message-daily-text": "var(--message-daily-text)",
  "message-reaction-bg": "var(--message-reaction-bg)",
  "message-reaction-border": "var(--message-reaction-border)",
  "message-error-text": "var(--message-error-text)",
  "message-ack-text": "var(--message-ack-text)",

  // SaaS mode
  "message-saas-bg": "var(--message-saas-bg)",
  "message-saas-text": "var(--message-saas-text)",
  "message-saas-bg-alt": "var(--message-saas-bg-alt)",
};

const groupedTokens = {
  colors: {
    bg: {
      default: TOKEN_MAP["bg-default"],
      surface: TOKEN_MAP["bg-surface"],
      surfaceAlt: TOKEN_MAP["bg-surface-alt"],
      sidebar: TOKEN_MAP["bg-sidebar"],
      appbar: TOKEN_MAP["bg-appbar"],
      content: TOKEN_MAP["bg-content"],
    },
    text: {
      primary: TOKEN_MAP["text-primary"],
      secondary: TOKEN_MAP["text-secondary"],
      muted: TOKEN_MAP["text-muted"],
      inverse: TOKEN_MAP["text-inverse"],
      sidebar: TOKEN_MAP["text-sidebar"],
      appbar: TOKEN_MAP["text-appbar"],
    },
    action: {
      primary: TOKEN_MAP["action-primary"],
      primaryHover: TOKEN_MAP["action-primary-hover"],
      primaryActive: TOKEN_MAP["action-primary-active"],
      primaryBg: TOKEN_MAP["action-primary-bg"],
    },
    status: {
      success: TOKEN_MAP["status-success"],
      error: TOKEN_MAP["status-error"],
      warning: TOKEN_MAP["status-warning"],
      info: TOKEN_MAP["status-info"],
      successBg: TOKEN_MAP["status-success-bg"],
      successText: TOKEN_MAP["status-success-text"],
      errorBg: TOKEN_MAP["status-error-bg"],
      errorText: TOKEN_MAP["status-error-text"],
      warningBg: TOKEN_MAP["status-warning-bg"],
      warningText: TOKEN_MAP["status-warning-text"],
      infoBg: TOKEN_MAP["status-info-bg"],
      infoText: TOKEN_MAP["status-info-text"],
      defaultBg: TOKEN_MAP["status-default-bg"],
      defaultText: TOKEN_MAP["status-default-text"],
      success10: TOKEN_MAP["status-success-10"],
      error10: TOKEN_MAP["status-error-10"],
      info4: TOKEN_MAP["status-info-4"],
      info8: TOKEN_MAP["status-info-8"],
      info15: TOKEN_MAP["status-info-15"],
      info30: TOKEN_MAP["status-info-30"],
      info40: TOKEN_MAP["status-info-40"],
    },
    border: {
      default: TOKEN_MAP["border-default"],
      subtle: TOKEN_MAP["border-subtle"],
      strong: TOKEN_MAP["border-strong"],
      sidebar: TOKEN_MAP["border-sidebar"],
      appbar: TOKEN_MAP["border-appbar"],
      divider: TOKEN_MAP["border-divider"],
      weak: TOKEN_MAP["border-weak"],
      logoDivider: TOKEN_MAP["border-logo-divider"],
    },
    overlay: {
      light: TOKEN_MAP["overlay-light"],
      medium: TOKEN_MAP["overlay-medium"],
      strong: TOKEN_MAP["overlay-strong"],
      dark: TOKEN_MAP["overlay-dark"],
      darkMedium: TOKEN_MAP["overlay-dark-medium"],
      darkStrong: TOKEN_MAP["overlay-dark-strong"],
      weak: TOKEN_MAP["overlay-weak"],
    },
    shadow: {
      sm: TOKEN_MAP["shadow-sm"],
      md: TOKEN_MAP["shadow-md"],
      lg: TOKEN_MAP["shadow-lg"],
      xl: TOKEN_MAP["shadow-xl"],
      sidebarGlow: TOKEN_MAP["shadow-sidebar-glow"],
      appbar: TOKEN_MAP["shadow-appbar"],
      light: TOKEN_MAP["shadow-light"],
      medium: TOKEN_MAP["shadow-medium"],
      strong: TOKEN_MAP["shadow-strong"],
    },
  },
  layout: {
    radius: {
      sm: TOKEN_MAP["radius-sm"],
      md: TOKEN_MAP["radius-md"],
      lg: TOKEN_MAP["radius-lg"],
      xl: TOKEN_MAP["radius-xl"],
      full: TOKEN_MAP["radius-full"],
    },
    spacing: {
      xs: TOKEN_MAP["spacing-xs"],
      sm: TOKEN_MAP["spacing-sm"],
      md: TOKEN_MAP["spacing-md"],
      lg: TOKEN_MAP["spacing-lg"],
      xl: TOKEN_MAP["spacing-xl"],
    },
    cardBg: TOKEN_MAP["card-bg"],
    cardBorderRadius: TOKEN_MAP["card-border-radius"],
    cardShadow: TOKEN_MAP["card-shadow"],
    cardPadding: TOKEN_MAP["card-padding"],
    cardGap: TOKEN_MAP["card-gap"],
    cardHoverTransform: TOKEN_MAP["card-hover-transform"],
    sidebarWidth: TOKEN_MAP["sidebar-width"],
    sidebarBg: TOKEN_MAP["sidebar-bg"],
    appbarHeight: TOKEN_MAP["appbar-height"],
    appbarBg: TOKEN_MAP["appbar-bg"],
  },
  button: {
    primaryBg: TOKEN_MAP["button-primary-bg"],
    primaryText: TOKEN_MAP["button-primary-text"],
    secondaryBg: TOKEN_MAP["button-secondary-bg"],
    outlineBorder: TOKEN_MAP["button-outline-border"],
    dangerBg: TOKEN_MAP["button-danger-bg"],
    smPadding: TOKEN_MAP["button-sm-padding"],
    lgPadding: TOKEN_MAP["button-lg-padding"],
    radius: TOKEN_MAP["button-radius"],
  },
  input: {
    padding: TOKEN_MAP["input-padding"],
    radius: TOKEN_MAP["input-radius"],
    errorBorder: TOKEN_MAP["input-error-border"],
  },
  nav: {
    itemHeight: TOKEN_MAP["nav-item-height"],
    itemRadius: TOKEN_MAP["nav-item-radius"],
    itemHoverBg: TOKEN_MAP["nav-item-hover-bg"],
    activeBg: TOKEN_MAP["nav-active-bg"],
    activeText: TOKEN_MAP["nav-active-text"],
  },
  motion: {
    easeOut: TOKEN_MAP["ease-out"],
    durationNormal: TOKEN_MAP["duration-normal"],
  },
  message: {
    leftBg: TOKEN_MAP["message-left-bg"],
    rightBg: TOKEN_MAP["message-right-bg"],
    leftText: TOKEN_MAP["message-left-text"],
    rightText: TOKEN_MAP["message-right-text"],
    quoteBg: TOKEN_MAP["message-quote-bg"],
    quoteText: TOKEN_MAP["message-quote-text"],
    quoteBorder: TOKEN_MAP["message-quote-border"],
    quoteSideLeft: TOKEN_MAP["message-quote-side-left"],
    quoteSideRight: TOKEN_MAP["message-quote-side-right"],
    timestampText: TOKEN_MAP["message-timestamp-text"],
    dailyBg: TOKEN_MAP["message-daily-bg"],
    dailyText: TOKEN_MAP["message-daily-text"],
    reactionBg: TOKEN_MAP["message-reaction-bg"],
    reactionBorder: TOKEN_MAP["message-reaction-border"],
    errorText: TOKEN_MAP["message-error-text"],
    ackText: TOKEN_MAP["message-ack-text"],
    saasBg: TOKEN_MAP["message-saas-bg"],
    saasText: TOKEN_MAP["message-saas-text"],
    saasBgAlt: TOKEN_MAP["message-saas-bg-alt"],
  },
};

export const useThemeTokens = () => {
  return useMemo(
    () => ({
      ...groupedTokens,
      getRaw: (name) => TOKEN_MAP[name] ?? null,
      getVar: (name) => TOKEN_MAP[name] ?? `var(--${name})`,
      has: (name) => name in TOKEN_MAP,
    }),
    []
  );
};
