import { useMemo } from "react";

export const TOKEN_MAP: Record<string, string> = {
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
  // Status
  "status-success": "var(--status-success)",
  "status-error": "var(--status-error)",
  "status-warning": "var(--status-warning)",
  "status-info": "var(--status-info)",
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
  // Radius
  "radius-sm": "var(--radius-sm)",
  "radius-md": "var(--radius-md)",
  "radius-lg": "var(--radius-lg)",
  "radius-xl": "var(--radius-xl)",
  "radius-full": "var(--radius-full)",
  // Spacing
  "spacing-xs": "var(--spacing-xs)",
  "spacing-sm": "var(--spacing-sm)",
  "spacing-md": "var(--spacing-md)",
  "spacing-lg": "var(--spacing-lg)",
  "spacing-xl": "var(--spacing-xl)",
  // Motion
  "ease-out": "var(--ease-out)",
  "duration-normal": "var(--duration-normal)",
  // Layout
  "card-bg": "var(--card-bg)",
  "sidebar-width": "var(--sidebar-width)",
  "appbar-height": "var(--appbar-height)",
  // Button
  "button-primary-bg": "var(--button-primary-bg)",
  "button-secondary-bg": "var(--button-secondary-bg)",
  "button-danger-bg": "var(--button-danger-bg)",
  // Input
  "input-padding": "var(--input-padding)",
  "input-radius": "var(--input-radius)",
  "input-error-border": "var(--input-error-border)",
  // Nav
  "nav-item-height": "var(--nav-item-height)",
  "nav-item-radius": "var(--nav-item-radius)",
  "nav-active-bg": "var(--nav-active-bg)",
  // Message
  "message-left-bg": "var(--message-left-bg)",
  "message-right-bg": "var(--message-right-bg)",
  "message-quote-bg": "var(--message-quote-bg)",
  "message-error-text": "var(--message-error-text)",
};

export interface ThemeTokens {
  colors: {
    bg: Record<string, string>;
    text: Record<string, string>;
    action: Record<string, string>;
    status: Record<string, string>;
    border: Record<string, string>;
    overlay: Record<string, string>;
    shadow: Record<string, string>;
  };
  layout: Record<string, string>;
  button: Record<string, string>;
  input: Record<string, string>;
  nav: Record<string, string>;
  motion: Record<string, string>;
  message: Record<string, string>;
  getRaw: (name?: string | null) => string | null;
  getVar: (name?: string | null) => string;
  has: (name?: string | null) => boolean;
}

export const useThemeTokens = (): ThemeTokens => {
  return useMemo(
    () => ({
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
          errorBg: TOKEN_MAP["status-error-bg"],
        },
        border: {
          default: TOKEN_MAP["border-default"],
          subtle: TOKEN_MAP["border-subtle"],
          strong: TOKEN_MAP["border-strong"],
          divider: TOKEN_MAP["border-divider"],
        },
        overlay: {
          light: TOKEN_MAP["overlay-light"],
          medium: TOKEN_MAP["overlay-medium"],
          strong: TOKEN_MAP["overlay-strong"],
          dark: TOKEN_MAP["overlay-dark"],
        },
        shadow: {
          sm: TOKEN_MAP["shadow-sm"],
          md: TOKEN_MAP["shadow-md"],
          lg: TOKEN_MAP["shadow-lg"],
          xl: TOKEN_MAP["shadow-xl"],
        },
      },
      layout: {
        cardBg: TOKEN_MAP["card-bg"],
        sidebarWidth: TOKEN_MAP["sidebar-width"],
        appbarHeight: TOKEN_MAP["appbar-height"],
      },
      button: {
        primaryBg: TOKEN_MAP["button-primary-bg"],
        secondaryBg: TOKEN_MAP["button-secondary-bg"],
        dangerBg: TOKEN_MAP["button-danger-bg"],
      },
      input: {
        padding: TOKEN_MAP["input-padding"],
        radius: TOKEN_MAP["input-radius"],
        errorBorder: TOKEN_MAP["input-error-border"],
      },
      nav: {
        itemHeight: TOKEN_MAP["nav-item-height"],
        itemRadius: TOKEN_MAP["nav-item-radius"],
        activeBg: TOKEN_MAP["nav-active-bg"],
      },
      motion: {
        easeOut: TOKEN_MAP["ease-out"],
        durationNormal: TOKEN_MAP["duration-normal"],
      },
      message: {
        leftBg: TOKEN_MAP["message-left-bg"],
        rightBg: TOKEN_MAP["message-right-bg"],
        quoteBg: TOKEN_MAP["message-quote-bg"],
        errorText: TOKEN_MAP["message-error-text"],
      },
      getRaw: (name?: string | null) => TOKEN_MAP[name as string] ?? null,
      getVar: (name?: string | null) => TOKEN_MAP[name as string] ?? `var(--${name})`,
      has: (name?: string | null) => (name as string) in TOKEN_MAP,
    }),
    []
  );
};
