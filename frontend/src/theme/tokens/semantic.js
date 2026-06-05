import { primitives as p } from './primitives';

// ──────────────────────────────────────────────
// BASE — Tokens universais (independentes de tema)
// ──────────────────────────────────────────────
const base = {
  // Brand colors (sempre disponíveis para FlowBuilder etc.)
  'brand-blue': p.blue[500],
  'brand-green': p.emerald[500],
  'brand-orange': p.amber[500],
  'brand-indigo': p.indigo[500],
  'brand-purple': p.purple[500],

  // Status — text/icon (universais)
  'status-success': p.emerald[500],
  'status-error': p.red[500],
  'status-warning': p.amber[500],
  'status-info': p.blue[500],

  // WhatsApp brand (sempre acessível)
  'whatsapp-brand': '#25D366',
  'whatsapp-bg': '#ECE5DD',
  'whatsapp-bubble-right': '#DCF8C6',
  'whatsapp-bubble-left': '#FFFFFF',

  // Status opaques (universais)
  'status-success-10': 'rgba(16, 185, 129, 0.1)',
  'status-error-10': 'rgba(239, 68, 68, 0.1)',
  'status-info-4': 'rgba(33, 150, 243, 0.04)',
  'status-info-8': 'rgba(33, 150, 243, 0.08)',
  'status-info-15': 'rgba(33, 150, 243, 0.15)',
  'status-info-30': 'rgba(33, 150, 243, 0.3)',
  'status-info-40': 'rgba(33, 150, 243, 0.4)',

  // Motion (universais)
  'ease-out': p.easing.easeOut,
  'duration-normal': p.duration.normal,
};

// ──────────────────────────────────────────────
// APPLE (default) — Blue-centric, clean
// ──────────────────────────────────────────────
export const appleLight = {
  ...base,
  // APPLE (default) — Blue-centric, clean iOS-like
  'bg-default': '#F2F2F7',    // iOS system background
  'bg-surface': '#FFFFFF',    // iOS card white
  'bg-surface-alt': '#E5E5EA', // iOS secondary
  'bg-sidebar': '#F5F5F7',    // iOS sidebar light grey
  'bg-appbar': '#F5F5F7',     // transparent blur-like
  
  'text-primary': '#000000',
  'text-secondary': '#8E8E93', // iOS secondary text
  'text-muted': '#C7C7CC',
  'text-inverse': '#FFFFFF',
  'text-sidebar': '#3A3A3C',

  'action-primary': '#007AFF', // Apple Blue
  'action-primary-hover': '#0055FF',
  'action-primary-bg': '#E6F0FF',
  'action-primary-active': '#0047CC',

  // Nav Icon Themes (Google-style)
  'nav-icon-blue': '#1A73E8',
  'nav-icon-purple': '#7C4DFF',
  'nav-icon-green': '#1E8E3E',
  'nav-icon-orange': '#E8710A',
  'nav-icon-red': '#D93025',
  'nav-icon-teal': '#00897B',
  'nav-icon-yellow': '#F9AB00',
  'nav-icon-pink': '#D01884',

  // Status — chip backgrounds (light)
  'status-success-bg': '#D2F8E6',
  'status-success-text': '#00883A',
  'status-error-bg': '#FCE8E6',
  'status-error-text': '#D70015',
  'status-warning-bg': '#FFF3D6',
  'status-warning-text': '#E37400',
  'status-info-bg': '#E7F2FF',
  'status-info-text': '#007AFF',
  'status-default-bg': '#E5E5EA',
  'status-default-text': '#8E8E93',

  // Border/Shadow
  'border-default': '#D1D1D6', // iOS default border
  'border-sidebar': '#D1D1D6',
  'border-appbar': '#D1D1D6',
  'border-divider': 'rgba(0, 0, 0, 0.1)',
  'border-subtle': 'rgba(0, 0, 0, 0.05)',
  'border-weak': 'rgba(0, 0, 0, 0.03)',

  // Shadow patterns (iOS-style soft shadows)
  'shadow-sm': '0 1px 3px rgba(0, 0, 0, 0.12)',
  'shadow-md': '0 3px 6px rgba(0, 0, 0, 0.16)',
  'shadow-lg': '0 6px 12px rgba(0, 0, 0, 0.2)',
  'shadow-xl': '0 10px 20px rgba(0, 0, 0, 0.25)',
  'shadow-sidebar-glow': 'none', // iOS sidebar no glow
  'shadow-appbar': 'none', // iOS appbar no shadow
  'shadow-light': '0 1px 2px rgba(0, 0, 0, 0.08)',
  'shadow-medium': '0 2px 4px rgba(0, 0, 0, 0.12)',
  'shadow-strong': '0 4px 8px rgba(0, 0, 0, 0.16)',

  // Layout
  'bg-content': '#F2F2F7',
  'text-appbar': '#000000',
  'border-logo-divider': 'rgba(0, 0, 0, 0.08)',

  // Message bubbles
  'message-left-bg': '#FFFFFF',
  'message-right-bg': '#E6F0FF', // Apple blue tint
  'message-left-text': '#000000',
  'message-right-text': '#000000',
  'message-quote-bg': '#F5F5F7',
  'message-quote-text': '#8E8E93',
  'message-quote-border': '#D1D1D6',
  'message-quote-side-left': '#007AFF',
  'message-quote-side-right': '#34C759', // Green
  'message-timestamp-text': '#8E8E93',
  'message-daily-bg': '#F5F5F7',
  'message-daily-text': '#8E8E93',
  'message-reaction-bg': '#FFFFFF',
  'message-reaction-border': '#D1D1D6',
  'message-error-text': '#FF3B30',
  'message-ack-text': '#8E8E93',

  // SaaS mode
  'message-saas-bg': '#007AFF',
  'message-saas-text': '#FFFFFF',
  'message-saas-bg-alt': '#F5F5F7',
};

export const appleDark = {
 ...base,
 // APPLE DARK — iOS Dark Mode palette
 'bg-default': '#000000',
 'bg-surface': '#1C1C1E',
 'bg-surface-alt': '#2C2C2E',
 'bg-sidebar': '#1C1C1E',
 'bg-appbar': '#1C1C1E',

 'text-primary': '#FFFFFF',
 'text-secondary': '#98989D', // iOS dark secondary
 'text-muted': '#636366',
 'text-inverse': '#000000',
 'text-sidebar': '#E5E5EA',

 'action-primary': '#0A84FF', // iOS Blue dark variant
 'action-primary-hover': '#409CFF',
 'action-primary-bg': '#1C3A5C',
 'action-primary-active': '#0A6FE6',

 // WhatsApp brand (dark variant)
 'whatsapp-brand': '#4AE980',

 // Nav Icon Themes (dark)
 'nav-icon-blue': '#0A84FF',
 'nav-icon-purple': '#BF5AF2', // iOS Purple
 'nav-icon-green': '#30D158', // iOS Green
 'nav-icon-orange': '#FF9F0A', // iOS Orange
 'nav-icon-red': '#FF453A', // iOS Red
 'nav-icon-teal': '#64D2FF', // iOS Teal
 'nav-icon-yellow': '#FFD60A', // iOS Yellow
 'nav-icon-pink': '#FF375F', // iOS Pink

 // Status — chip backgrounds (dark)
 'status-success-bg': '#1B3A26',
 'status-success-text': '#30D158',
 'status-error-bg': '#3A1B1B',
 'status-error-text': '#FF453A',
 'status-warning-bg': '#3A2E1B',
 'status-warning-text': '#FF9F0A',
 'status-info-bg': '#1B2A3A',
 'status-info-text': '#0A84FF',
 'status-default-bg': '#2C2C2E',
 'status-default-text': '#98989D',

 // Border/Shadow
 'border-default': '#38383A',
 'border-sidebar': '#38383A',
 'border-appbar': '#38383A',
 'border-divider': 'rgba(255, 255, 255, 0.08)',
 'border-subtle': 'rgba(255, 255, 255, 0.04)',
 'border-weak': 'rgba(255, 255, 255, 0.02)',

 // Shadow patterns (iOS dark — subtle)
 'shadow-sm': '0 1px 3px rgba(0,0,0,0.4)',
 'shadow-md': '0 3px 6px rgba(0,0,0,0.5)',
 'shadow-lg': '0 6px 12px rgba(0,0,0,0.6)',
 'shadow-xl': '0 10px 20px rgba(0,0,0,0.7)',
 'shadow-sidebar-glow': 'none',
 'shadow-appbar': 'none',
 'shadow-light': '0 1px 2px rgba(0,0,0,0.3)',
 'shadow-medium': '0 2px 4px rgba(0,0,0,0.4)',
 'shadow-strong': '0 4px 8px rgba(0,0,0,0.5)',

 // Layout
 'bg-content': '#000000',
 'text-appbar': '#FFFFFF',
 'border-logo-divider': 'rgba(255,255,255,0.06)',

 // Message bubbles
 'message-left-bg': '#1C1C1E',
 'message-right-bg': '#1C3A5C',
 'message-left-text': '#FFFFFF',
 'message-right-text': '#FFFFFF',
 'message-quote-bg': '#2C2C2E',
 'message-quote-text': '#98989D',
 'message-quote-border': '#38383A',
 'message-quote-side-left': '#0A84FF',
 'message-quote-side-right': '#30D158',
 'message-timestamp-text': '#636366',
 'message-daily-bg': '#2C2C2E',
 'message-daily-text': '#98989D',
 'message-reaction-bg': '#1C1C1E',
 'message-reaction-border': '#38383A',
 'message-error-text': '#FF453A',
 'message-ack-text': '#636366',

 // SaaS mode
 'message-saas-bg': '#0A84FF',
 'message-saas-text': '#FFFFFF',
 'message-saas-bg-alt': '#2C2C2E',
};

// ──────────────────────────────────────────────
// WHATSAPP — Paleta clássica WhatsApp Web
// ──────────────────────────────────────────────
export const whatsappLight = {
  ...base,
  // Backgrounds — WhatsApp chat wallpaper tone
  'bg-default': '#ECE5DD',
  'bg-surface': '#FFFFFF',
  'bg-surface-alt': '#F0F0F0',
  'bg-sidebar': '#FFFFFF',
  'bg-appbar': '#075E54',

  // Text — high contrast on light beige
  'text-primary': '#1B2821',
  'text-secondary': '#667781',
  'text-muted': '#8696A0',
  'text-inverse': '#FFFFFF',
  'text-sidebar': '#1B2821',

  // Action — WhatsApp teal (#075E54 = header, #25D366 = brand accent)
  'action-primary': '#25D366',
  'action-primary-hover': '#1DA851',
  'action-primary-bg': '#DCF8C6',
  'action-primary-active': '#128C3E',

  // Nav Icons — WhatsApp mono-teal palette
  'nav-icon-blue': '#075E54',
  'nav-icon-purple': '#075E54',
  'nav-icon-green': '#25D366',
  'nav-icon-orange': '#075E54',
  'nav-icon-red': '#EA4335',
  'nav-icon-teal': '#075E54',
  'nav-icon-yellow': '#F9AB00',
  'nav-icon-pink': '#075E54',

  // Status — chip backgrounds
  'status-success-bg': '#DCF8C6',
  'status-success-text': '#075E54',
  'status-error-bg': '#FDECEA',
  'status-error-text': '#D32F2F',
  'status-warning-bg': '#FFF3CD',
  'status-warning-text': '#856404',
  'status-info-bg': '#E1F3FB',
  'status-info-text': '#075E54',
  'status-default-bg': '#F0F0F0',
  'status-default-text': '#667781',

  // Border/Shadow — WhatsApp subtle dividers
  'border-default': '#E0E0E0',
  'border-sidebar': '#E0E0E0',
  'border-appbar': 'rgba(255,255,255,0.15)',
  'border-divider': 'rgba(0, 0, 0, 0.08)',
  'border-subtle': 'rgba(0, 0, 0, 0.04)',
  'border-weak': 'rgba(0, 0, 0, 0.02)',

  // Overlay
  'overlay-light': 'rgba(255, 255, 255, 0.3)',
  'overlay-medium': 'rgba(255, 255, 255, 0.7)',
  'overlay-strong': 'rgba(255, 255, 255, 0.95)',
  'overlay-dark': 'rgba(0, 0, 0, 0.2)',
  'overlay-dark-medium': 'rgba(0, 0, 0, 0.5)',
  'overlay-dark-strong': 'rgba(0, 0, 0, 0.7)',
  'overlay-weak': 'rgba(0, 0, 0, 0.05)',

  // Shadow — WhatsApp flat/elevated
  'shadow-sm': '0 1px 1px rgba(0,0,0,0.06)',
  'shadow-md': '0 2px 8px rgba(0,0,0,0.08)',
  'shadow-lg': '0 4px 12px rgba(0,0,0,0.1)',
  'shadow-xl': '0 8px 24px rgba(0,0,0,0.12)',
  'shadow-sidebar-glow': 'none',
  'shadow-appbar': '0 1px 3px rgba(0,0,0,0.08)',
  'shadow-light': '0 1px 2px rgba(0,0,0,0.04)',
  'shadow-medium': '0 2px 8px rgba(0,0,0,0.08)',
  'shadow-strong': '0 4px 16px rgba(0,0,0,0.12)',

  // Layout
  'bg-content': '#ECE5DD',
  'text-appbar': '#FFFFFF',
  'border-logo-divider': 'rgba(0,0,0,0.06)',

  // Message bubbles — WhatsApp classic
  'message-left-bg': '#FFFFFF',
  'message-right-bg': '#DCF8C6',
  'message-left-text': '#1B2821',
  'message-right-text': '#1B2821',
  'message-quote-bg': '#F0F0F0',
  'message-quote-text': '#667781',
  'message-quote-border': '#E0E0E0',
  'message-quote-side-left': '#075E54',
  'message-quote-side-right': '#25D366',
  'message-timestamp-text': '#8696A0',
  'message-daily-bg': '#FFFFFF',
  'message-daily-text': '#667781',
  'message-reaction-bg': '#FFFFFF',
  'message-reaction-border': '#E0E0E0',
  'message-error-text': '#D32F2F',
  'message-ack-text': '#8696A0',

  // SaaS mode (whatsapp variant)
  'message-saas-bg': '#25D366',
  'message-saas-text': '#FFFFFF',
  'message-saas-bg-alt': '#F0F0F0',
};

export const whatsappDark = {
  ...base,
  // Backgrounds — WhatsApp dark mode
  'bg-default': '#0B141A',
  'bg-surface': '#1F2C34',
  'bg-surface-alt': '#111B21',
  'bg-sidebar': '#111B21',
  'bg-appbar': '#1F2C34',

  // Text
  'text-primary': '#E9EDEF',
  'text-secondary': '#8696A0',
  'text-muted': '#667781',
  'text-inverse': '#1B2821',
  'text-sidebar': '#E9EDEF',

  // Action
  'action-primary': '#25D366',
  'action-primary-hover': '#1DA851',
  'action-primary-bg': '#1F2C34',
  'action-primary-active': '#128C3E',

  // WhatsApp brand (dark variant)
  'whatsapp-brand': '#4AE980',
  'whatsapp-bg': '#0B141A',
  'whatsapp-bubble-right': '#005C4B',
  'whatsapp-bubble-left': '#1F2C34',

  // Nav Icons
  'nav-icon-blue': '#25D366',
  'nav-icon-purple': '#8696A0',
  'nav-icon-green': '#25D366',
  'nav-icon-orange': '#8696A0',
  'nav-icon-red': '#EA4335',
  'nav-icon-teal': '#25D366',
  'nav-icon-yellow': '#F9AB00',
  'nav-icon-pink': '#8696A0',

  // Status — chip backgrounds (dark)
  'status-success-bg': '#005C4B',
  'status-success-text': '#DCF8C6',
  'status-error-bg': '#3B1C1C',
  'status-error-text': '#F28B82',
  'status-warning-bg': '#3B2F1C',
  'status-warning-text': '#FDD663',
  'status-info-bg': '#0B2534',
  'status-info-text': '#8AB4F8',
  'status-default-bg': '#1F2C34',
  'status-default-text': '#8696A0',

  // Border/Shadow
  'border-default': '#2A3942',
  'border-sidebar': '#2A3942',
  'border-appbar': '#2A3942',
  'border-divider': 'rgba(255, 255, 255, 0.06)',
  'border-subtle': 'rgba(255, 255, 255, 0.03)',
  'border-weak': 'rgba(255, 255, 255, 0.02)',

  // Overlay
  'overlay-light': 'rgba(0, 0, 0, 0.3)',
  'overlay-medium': 'rgba(0, 0, 0, 0.5)',
  'overlay-strong': 'rgba(0, 0, 0, 0.8)',
  'overlay-dark': 'rgba(255, 255, 255, 0.1)',
  'overlay-dark-medium': 'rgba(255, 255, 255, 0.5)',
  'overlay-dark-strong': 'rgba(255, 255, 255, 0.7)',
  'overlay-weak': 'rgba(255, 255, 255, 0.05)',

  // Shadow
  'shadow-sm': '0 1px 2px rgba(0,0,0,0.3)',
  'shadow-md': '0 2px 8px rgba(0,0,0,0.3)',
  'shadow-lg': '0 4px 12px rgba(0,0,0,0.4)',
  'shadow-xl': '0 8px 24px rgba(0,0,0,0.5)',
  'shadow-sidebar-glow': 'none',
  'shadow-appbar': '0 1px 3px rgba(0,0,0,0.3)',
  'shadow-light': '0 1px 2px rgba(0,0,0,0.2)',
  'shadow-medium': '0 2px 8px rgba(0,0,0,0.3)',
  'shadow-strong': '0 4px 16px rgba(0,0,0,0.4)',

  // Layout
  'bg-content': '#0B141A',
  'text-appbar': '#E9EDEF',
  'border-logo-divider': 'rgba(255,255,255,0.04)',

  // Message bubbles — WhatsApp dark
  'message-left-bg': '#1F2C34',
  'message-right-bg': '#005C4B',
  'message-left-text': '#E9EDEF',
  'message-right-text': '#E9EDEF',
  'message-quote-bg': '#1A2731',
  'message-quote-text': '#8696A0',
  'message-quote-border': '#2A3942',
  'message-quote-side-left': '#8696A0',
  'message-quote-side-right': '#25D366',
  'message-timestamp-text': '#667781',
  'message-daily-bg': '#1F2C34',
  'message-daily-text': '#8696A0',
  'message-reaction-bg': '#1F2C34',
  'message-reaction-border': '#2A3942',
  'message-error-text': '#F28B82',
  'message-ack-text': '#667781',

  // SaaS mode (whatsapp dark)
  'message-saas-bg': '#25D366',
  'message-saas-text': '#FFFFFF',
  'message-saas-bg-alt': '#111B21',
  };

  export const googleLight = {
  ...base,
  'bg-default': '#F8F9FA', 'bg-surface': '#FFFFFF', 'bg-surface-alt': '#F1F3F4', 'bg-sidebar': '#FFFFFF', 'bg-appbar': '#FFFFFF',
  'text-primary': '#202124', 'text-secondary': '#5F6368', 'text-muted': '#80868B', 'text-inverse': '#FFFFFF', 'text-sidebar': '#202124',
  'action-primary': '#1A73E8', 'action-primary-hover': '#1558B0', 'action-primary-bg': '#E8F0FE', 'action-primary-active': '#174EA6',
  'nav-icon-blue': '#1A73E8', 'nav-icon-purple': '#7C4DFF', 'nav-icon-green': '#1E8E3E', 'nav-icon-orange': '#E8710A', 'nav-icon-red': '#D93025', 'nav-icon-teal': '#00897B', 'nav-icon-yellow': '#F9AB00', 'nav-icon-pink': '#D01884',
  'status-success-bg': '#E6F4EA', 'status-success-text': '#137333', 'status-error-bg': '#FCE8E6', 'status-error-text': '#C5221F', 'status-warning-bg': '#FEF7E0', 'status-warning-text': '#E37400', 'status-info-bg': '#E8F0FE', 'status-info-text': '#1967D2', 'status-default-bg': '#F1F3F4', 'status-default-text': '#5F6368',
  'border-default': '#DADCE0', 'border-sidebar': '#E8EAED', 'border-appbar': '#DADCE0', 'border-divider': 'rgba(0,0,0,0.1)', 'border-subtle': 'rgba(0,0,0,0.05)', 'border-weak': 'rgba(0,0,0,0.03)',
  'overlay-light': 'rgba(255,255,255,0.3)', 'overlay-medium': 'rgba(255,255,255,0.7)', 'overlay-strong': 'rgba(255,255,255,0.95)', 'overlay-dark': 'rgba(0,0,0,0.2)', 'overlay-dark-medium': 'rgba(0,0,0,0.5)', 'overlay-dark-strong': 'rgba(0,0,0,0.7)', 'overlay-weak': 'rgba(0,0,0,0.05)',
  'shadow-sm': '0 1px 2px 0 rgba(60,64,67,0.1)', 'shadow-md': '0 1px 3px 0 rgba(60,64,67,0.15)', 'shadow-lg': '0 1px 6px 0 rgba(60,64,67,0.2)', 'shadow-xl': '0 2px 10px 0 rgba(60,64,67,0.25)', 'shadow-sidebar-glow': '0 1px 3px rgba(60,64,67,0.1)', 'shadow-appbar': '0 1px 2px 0 rgba(60,64,67,0.1)', 'shadow-light': '0 1px 1px rgba(60,64,67,0.05)', 'shadow-medium': '0 2px 6px rgba(60,64,67,0.1)', 'shadow-strong': '0 4px 12px rgba(60,64,67,0.2)',
  'bg-content': '#F8F9FA', 'text-appbar': '#202124', 'border-logo-divider': 'rgba(0,0,0,0.06)',
  'message-left-bg': '#FFFFFF', 'message-right-bg': '#E6F4EA', 'message-left-text': '#202124', 'message-right-text': '#202124', 'message-quote-bg': '#F1F3F4', 'message-quote-text': '#5F6368', 'message-quote-border': '#DADCE0', 'message-quote-side-left': '#1A73E8', 'message-quote-side-right': '#1E8E3E', 'message-timestamp-text': '#80868B', 'message-daily-bg': '#E8F0FE', 'message-daily-text': '#5F6368', 'message-reaction-bg': '#FFFFFF', 'message-reaction-border': '#DADCE0', 'message-error-text': '#D93025', 'message-ack-text': '#80868B',
  'message-saas-bg': '#1A73E8', 'message-saas-text': '#FFFFFF', 'message-saas-bg-alt': '#F1F3F4',
  };

  export const googleDark = {
  ...base,
  'bg-default': '#202124', 'bg-surface': '#2D2E30', 'bg-surface-alt': '#242527', 'bg-sidebar': '#202124', 'bg-appbar': '#2D2E30',
  'text-primary': '#E8EAED', 'text-secondary': '#9AA0A6', 'text-muted': '#80868B', 'text-inverse': '#202124', 'text-sidebar': '#E8EAED',
  'action-primary': '#8AB4F8', 'action-primary-hover': '#A8C7FA', 'action-primary-bg': '#1A3A5C', 'action-primary-active': '#D3E3FD',
  'nav-icon-blue': '#8AB4F8', 'nav-icon-purple': '#B388FF', 'nav-icon-green': '#81C995', 'nav-icon-orange': '#FCAD70', 'nav-icon-red': '#F28B82', 'nav-icon-teal': '#78D9C0', 'nav-icon-yellow': '#FDD663', 'nav-icon-pink': '#F48FB1',
  'status-success-bg': '#1B3626', 'status-success-text': '#81C995', 'status-error-bg': '#3C1C1C', 'status-error-text': '#F28B82', 'status-warning-bg': '#3B2F1C', 'status-warning-text': '#FCAD70', 'status-info-bg': '#1A3A5C', 'status-info-text': '#8AB4F8', 'status-default-bg': '#2D2E30', 'status-default-text': '#9AA0A6',
  'border-default': '#3C4043', 'border-sidebar': '#3C4043', 'border-appbar': '#3C4043', 'border-divider': 'rgba(255,255,255,0.12)', 'border-subtle': 'rgba(255,255,255,0.06)', 'border-weak': 'rgba(255,255,255,0.03)',
  'overlay-light': 'rgba(0,0,0,0.3)', 'overlay-medium': 'rgba(0,0,0,0.5)', 'overlay-strong': 'rgba(0,0,0,0.8)', 'overlay-dark': 'rgba(255,255,255,0.1)', 'overlay-dark-medium': 'rgba(255,255,255,0.5)', 'overlay-dark-strong': 'rgba(255,255,255,0.7)', 'overlay-weak': 'rgba(255,255,255,0.05)',
  'shadow-sm': '0 1px 3px rgba(0,0,0,0.3)', 'shadow-md': '0 2px 6px rgba(0,0,0,0.3)', 'shadow-lg': '0 4px 12px rgba(0,0,0,0.4)', 'shadow-xl': '0 8px 24px rgba(0,0,0,0.5)', 'shadow-sidebar-glow': 'none', 'shadow-appbar': '0 1px 3px rgba(0,0,0,0.3)', 'shadow-light': '0 1px 2px rgba(0,0,0,0.2)', 'shadow-medium': '0 2px 8px rgba(0,0,0,0.3)', 'shadow-strong': '0 4px 16px rgba(0,0,0,0.4)',
  'bg-content': '#202124', 'text-appbar': '#E8EAED', 'border-logo-divider': 'rgba(255,255,255,0.06)',
  'message-left-bg': '#2D2E30', 'message-right-bg': '#004D40', 'message-left-text': '#E8EAED', 'message-right-text': '#E8EAED', 'message-quote-bg': '#242527', 'message-quote-text': '#9AA0A6', 'message-quote-border': '#3C4043', 'message-quote-side-left': '#8AB4F8', 'message-quote-side-right': '#81C995', 'message-timestamp-text': '#80868B', 'message-daily-bg': '#2D2E30', 'message-daily-text': '#9AA0A6', 'message-reaction-bg': '#2D2E30', 'message-reaction-border': '#3C4043', 'message-error-text': '#F28B82', 'message-ack-text': '#80868B',
  'message-saas-bg': '#8AB4F8', 'message-saas-text': '#202124', 'message-saas-bg-alt': '#242527',
  };

  export const saasLight = {
  ...base,
  'bg-default': '#f1f5f9', 'bg-surface': '#ffffff', 'bg-surface-alt': '#e2e8f0', 'bg-sidebar': '#0f172a', 'bg-appbar': '#ffffff',
  'text-primary': '#171717', 'text-secondary': '#64748b', 'text-muted': '#94a3b8', 'text-inverse': '#ffffff', 'text-sidebar': '#cbd5e1',
  'action-primary': '#2563eb', 'action-primary-hover': '#1d4ed8', 'action-primary-bg': '#eff6ff', 'action-primary-active': '#1e40af',
  'nav-icon-blue': '#2563eb', 'nav-icon-purple': '#2563eb', 'nav-icon-green': '#10b981', 'nav-icon-orange': '#f59e0b', 'nav-icon-red': '#ef4444', 'nav-icon-teal': '#2563eb', 'nav-icon-yellow': '#fbbf24', 'nav-icon-pink': '#2563eb',
  'status-success-bg': '#e6f4ea', 'status-success-text': '#137333', 'status-error-bg': '#fce8e6', 'status-error-text': '#c5221f', 'status-warning-bg': '#fef7e0', 'status-warning-text': '#e37400', 'status-info-bg': '#e8f0fe', 'status-info-text': '#1967d2', 'status-default-bg': '#f1f3f4', 'status-default-text': '#5f6368',
  'border-default': '#e2e8f0', 'border-sidebar': '#1e293b', 'border-appbar': '#e2e8f0', 'border-divider': 'rgba(0,0,0,0.12)', 'border-subtle': 'rgba(0,0,0,0.05)', 'border-weak': 'rgba(0,0,0,0.03)',
  'overlay-light': 'rgba(255,255,255,0.3)', 'overlay-medium': 'rgba(255,255,255,0.7)', 'overlay-strong': 'rgba(255,255,255,0.95)', 'overlay-dark': 'rgba(0,0,0,0.2)', 'overlay-dark-medium': 'rgba(0,0,0,0.5)', 'overlay-dark-strong': 'rgba(0,0,0,0.7)', 'overlay-weak': 'rgba(0,0,0,0.05)',
  'shadow-sm': '0 1px 2px 0 rgba(60,64,67,0.1)', 'shadow-md': '0 1px 3px 0 rgba(60,64,67,0.15)', 'shadow-lg': '0 1px 6px 0 rgba(60,64,67,0.2)', 'shadow-xl': '0 2px 10px 0 rgba(60,64,67,0.25)', 'shadow-sidebar-glow': '0 1px 3px rgba(60,64,67,0.1)', 'shadow-appbar': '0 1px 2px 0 rgba(60,64,67,0.1)', 'shadow-light': '0 1px 1px rgba(60,64,67,0.05)', 'shadow-medium': '0 2px 6px rgba(60,64,67,0.1)', 'shadow-strong': '0 4px 12px rgba(60,64,67,0.2)',
  'bg-content': '#f1f5f9', 'text-appbar': '#1e293b', 'border-logo-divider': 'rgba(0,0,0,0.05)',
  'message-left-bg': '#ffffff', 'message-right-bg': '#e6f4ea', 'message-left-text': '#202124', 'message-right-text': '#202124', 'message-quote-bg': '#f1f3f4', 'message-quote-text': '#5f6368', 'message-quote-border': '#dadee0', 'message-quote-side-left': '#1a73e8', 'message-quote-side-right': '#1e8e3e', 'message-timestamp-text': '#80868b', 'message-daily-bg': '#e8f0fe', 'message-daily-text': '#5f6368', 'message-reaction-bg': '#ffffff', 'message-reaction-border': '#dadee0', 'message-error-text': '#d93025', 'message-ack-text': '#80868b',
  'message-saas-bg': '#2563eb', 'message-saas-text': '#ffffff', 'message-saas-bg-alt': '#e2e8f0',
  };

  export const saasDark = {
  ...base,
  'bg-default': '#0f172a', 'bg-surface': '#1e293b', 'bg-surface-alt': '#1B2331', 'bg-sidebar': '#0f172a', 'bg-appbar': '#1e293b',
  'text-primary': '#f1f5f9', 'text-secondary': '#94a3b8', 'text-muted': '#64748b', 'text-inverse': '#171717', 'text-sidebar': '#cbd5e1',
  'action-primary': '#60a5fa', 'action-primary-hover': '#93c5fd', 'action-primary-bg': '#1e3a8a', 'action-primary-active': '#bfdbfe',
  'nav-icon-blue': '#60a5fa', 'nav-icon-purple': '#60a5fa', 'nav-icon-green': '#34d399', 'nav-icon-orange': '#fbbf24', 'nav-icon-red': '#f87171', 'nav-icon-teal': '#60a5fa', 'nav-icon-yellow': '#fbbf24', 'nav-icon-pink': '#60a5fa',
  'status-success-bg': '#1b3626', 'status-success-text': '#81c995', 'status-error-bg': '#3c1c1c', 'status-error-text': '#f28b82', 'status-warning-bg': '#3b2f1c', 'status-warning-text': '#fcad70', 'status-info-bg': '#1a3a5c', 'status-info-text': '#8ab4f8', 'status-default-bg': '#2d2e30', 'status-default-text': '#9aa0a6',
  'border-default': '#334155', 'border-sidebar': '#334155', 'border-appbar': '#334155', 'border-divider': 'rgba(255,255,255,0.12)', 'border-subtle': 'rgba(255,255,255,0.05)', 'border-weak': 'rgba(255,255,255,0.03)',
  'overlay-light': 'rgba(0,0,0,0.3)', 'overlay-medium': 'rgba(0,0,0,0.5)', 'overlay-strong': 'rgba(0,0,0,0.8)', 'overlay-dark': 'rgba(255,255,255,0.1)', 'overlay-dark-medium': 'rgba(255,255,255,0.5)', 'overlay-dark-strong': 'rgba(255,255,255,0.7)', 'overlay-weak': 'rgba(255,255,255,0.05)',
  'shadow-sm': '0 1px 3px rgba(0,0,0,0.3)', 'shadow-md': '0 2px 6px rgba(0,0,0,0.3)', 'shadow-lg': '0 4px 12px rgba(0,0,0,0.4)', 'shadow-xl': '0 8px 24px rgba(0,0,0,0.5)', 'shadow-sidebar-glow': 'none', 'shadow-appbar': '0 1px 3px rgba(0,0,0,0.3)', 'shadow-light': '0 1px 2px rgba(0,0,0,0.2)', 'shadow-medium': '0 2px 8px rgba(0,0,0,0.3)', 'shadow-strong': '0 4px 16px rgba(0,0,0,0.4)',
  'bg-content': '#0f172a', 'text-appbar': '#f1f5f9', 'border-logo-divider': 'rgba(255,255,255,0.05)',
  'message-left-bg': '#1e293b', 'message-right-bg': '#004d40', 'message-left-text': '#f1f5f9', 'message-right-text': '#f1f5f9', 'message-quote-bg': '#1e293b', 'message-quote-text': '#94a3b8', 'message-quote-border': '#334155', 'message-quote-side-left': '#60a5fa', 'message-quote-side-right': '#34d399', 'message-timestamp-text': '#80868b', 'message-daily-bg': '#1e293b', 'message-daily-text': '#94a3b8', 'message-reaction-bg': '#1e293b', 'message-reaction-border': '#334155', 'message-error-text': '#f87171', 'message-ack-text': '#80868b',
  'message-saas-bg': '#60a5fa', 'message-saas-text': '#171717', 'message-saas-bg-alt': '#262626',
  };

  // ──────────────────────────────────────────────
  // Backward-compatible aliases
  // ──────────────────────────────────────────────
  export const light = appleLight;
  export const dark = appleDark;
