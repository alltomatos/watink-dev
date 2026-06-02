import { primitives as p } from './primitives';

export const light = {
  // Backgrounds
  'bg-default':      p.slate[50],      // #F1F5F9 - área principal
  'bg-surface':      p.neutral[0],     // var(--bg-surface) - cards
  'bg-surface-alt':  p.slate[100],     // #F1F5F9 - listas, sidebars
  'bg-sidebar':      p.slate[800],     // #1E293B
  'bg-appbar':       p.neutral[0],     // var(--bg-surface)

  // Text
  'text-primary':    p.neutral[900],   // #111827
  'text-secondary':  p.slate[500],     // #64748B
  'text-muted':      p.slate[400],     // #94A3B8
  'text-inverse':    p.neutral[0],     // var(--bg-surface)
  'text-sidebar':    p.slate[200],     // #E2E8F0

  // Action
  'action-primary':       p.blue[500],
  'action-primary-hover': p.blue[600],
  'action-primary-bg':    p.blue[50],

  // Status — text/icon
  'status-success': p.emerald[500],
  'status-error': p.red[500],
  'status-warning': p.amber[500],
  'status-info': p.blue[500],

  // Status — chip backgrounds (light)
  'status-success-bg': p.emerald[50],
  'status-success-text': p.emerald[800],
  'status-error-bg': p.red[50],
  'status-error-text': p.red[800],
  'status-warning-bg': p.amber[50],
  'status-warning-text': p.amber[800],
  'status-info-bg': p.blue[50],
  'status-info-text': p.blue[800],
  'status-default-bg': p.neutral[100],
  'status-default-text': p.neutral[500],

  // Border/Shadow
  'border-default': p.slate[200],
  'border-sidebar': p.slate[700],
  'border-appbar': p.slate[200],
  'border-divider': 'rgba(0, 0, 0, 0.12)',
  'border-subtle': 'rgba(0, 0, 0, 0.05)',
  'border-weak': 'rgba(0, 0, 0, 0.03)',
  
  // Overlay patterns
  'overlay-light': 'rgba(255, 255, 255, 0.3)',
  'overlay-medium': 'rgba(255, 255, 255, 0.7)',
  'overlay-strong': 'rgba(255, 255, 255, 0.95)',
  'overlay-dark': 'rgba(0, 0, 0, 0.2)',
  'overlay-dark-medium': 'rgba(0, 0, 0, 0.5)',
  'overlay-dark-strong': 'rgba(0, 0, 0, 0.7)',
  'overlay-weak': 'rgba(0, 0, 0, 0.05)',

  // Status opaques (10%)
  'status-success-10': 'rgba(16, 185, 129, 0.1)',
  'status-error-10': 'rgba(239, 68, 68, 0.1)',
  'status-info-4': 'rgba(33, 150, 243, 0.04)',
  'status-info-8': 'rgba(33, 150, 243, 0.08)',
  'status-info-15': 'rgba(33, 150, 243, 0.15)',
  'status-info-30': 'rgba(33, 150, 243, 0.3)',
  'status-info-40': 'rgba(33, 150, 243, 0.4)',
  
  // Shadow patterns
  'shadow-sm': p.shadow.xs,
  'shadow-md': p.shadow.md,
  'shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  'shadow-xl': p.shadow.xl,
  'shadow-sidebar-glow': '0 0 20px rgba(0,0,0,0.1)',
  'shadow-appbar': '0 1px 3px 0 rgba(0,0,0,0.1)',
  'shadow-light': '0 2px 4px rgba(0,0,0,0.05)',
  'shadow-medium': '0 4px 12px rgba(0,0,0,0.08)',
  'shadow-strong': '0 8px 30px rgba(0,0,0,0.12)',

  // Layout
  'bg-content': p.slate[50],
  'text-appbar': p.slate[800],
  'border-logo-divider': 'rgba(0,0,0,0.05)',

  // Motion
  'ease-out': p.easing.easeOut,
  'duration-normal': p.duration.normal,

  // Message bubbles
  'message-left-bg': p.neutral[0],           // var(--bg-surface) - left bubble
  'message-right-bg': p.emerald[100],         // #DCF8C6 - right bubble
  'message-left-text': p.slate[800],          // #303030 - left text
  'message-right-text': p.slate[800],         // #303030 - right text
  'message-quote-bg': p.slate[100],           // #F0F0F0 - quoted container
  'message-quote-text': p.slate[600],         // #666666 - quoted text
  'message-quote-border': p.slate[300],       // #E5E7EB - quoted border
  'message-quote-side-left': p.blue[300],     // #6BCBEF - quote indicator left
  'message-quote-side-right': p.emerald[400], // #35CD96 - quote indicator right
  'message-timestamp-text': p.slate[500],     // #999999 - timestamp
  'message-daily-bg': p.blue[100],            // #E1F3FB - daily separator
  'message-daily-text': p.slate[600],         // #808888 - daily text
  'message-reaction-bg': p.neutral[0],        // var(--bg-surface) - reactions
  'message-reaction-border': p.slate[200],    // #E0E0E0 - reaction border
  'message-error-text': p.red[500],           // #F44336 - error ack
  'message-ack-text': p.slate[500],           // #999999 - ack icons

  // SaaS mode
  'message-saas-bg': p.blue[500],             // SaaS primary bubble
  'message-saas-text': p.neutral[0],          // var(--bg-surface)
  'message-saas-bg-alt': p.slate[100],        // #F3F4F6 - SaaS left
  };

export const dark = {
  'bg-default':      p.neutral[950],
  'bg-surface':      p.slate[800],
  'bg-surface-alt':  p.slate[900],
  'bg-sidebar':      p.neutral[950],
  'bg-appbar':       p.slate[800],

  'text-primary':    p.slate[100],
  'text-secondary':  p.slate[400],
  'text-muted':      p.slate[500],
  'text-inverse':    p.neutral[900],
  'text-sidebar':    p.slate[300],

  'action-primary':       p.blue[400],
  'action-primary-hover': p.blue[300],
  'action-primary-bg':    p.blue[900],
  // Status — text/icon
  'status-success': p.emerald[500],
  'status-error': p.red[500],
  'status-warning': p.amber[500],
  'status-info': p.blue[500],

  // Status — chip backgrounds (dark)
  'status-success-bg': p.emerald[900],
  'status-success-text': p.emerald[100],
  'status-error-bg': p.red[900],
  'status-error-text': p.red[100],
  'status-warning-bg': p.amber[900],
  'status-warning-text': p.amber[100],
  'status-info-bg': p.blue[900],
  'status-info-text': p.blue[100],
  'status-default-bg': p.slate[800],
  'status-default-text': p.slate[300],

  // Border/Shadow
  'border-default': p.slate[700],
  'border-sidebar': p.slate[600],
  'border-appbar': p.slate[700],
  'border-divider': 'rgba(255, 255, 255, 0.12)',
  'border-subtle': 'rgba(255, 255, 255, 0.05)',
  'border-weak': 'rgba(255, 255, 255, 0.03)',

  // Overlay patterns
  'overlay-light': 'rgba(0, 0, 0, 0.3)',
  'overlay-medium': 'rgba(0, 0, 0, 0.5)',
  'overlay-strong': 'rgba(0, 0, 0, 0.8)',
  'overlay-dark': 'rgba(255, 255, 255, 0.1)',
  'overlay-dark-medium': 'rgba(255, 255, 255, 0.5)',
  'overlay-dark-strong': 'rgba(255, 255, 255, 0.7)',
  'overlay-weak': 'rgba(255, 255, 255, 0.05)',

  // Status opaques (10%)
  'status-success-10': 'rgba(16, 185, 129, 0.1)',
  'status-error-10': 'rgba(239, 68, 68, 0.1)',
  'status-info-4': 'rgba(33, 150, 243, 0.04)',
  'status-info-8': 'rgba(33, 150, 243, 0.08)',
  'status-info-15': 'rgba(33, 150, 243, 0.15)',
  'status-info-30': 'rgba(33, 150, 243, 0.3)',
  'status-info-40': 'rgba(33, 150, 243, 0.4)',

  // Shadow patterns
  'shadow-sm': '0 1px 2px 0 rgba(0,0,0,0.3)',
  'shadow-md': '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)',
  'shadow-lg': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.2)',
  'shadow-xl': '0 20px 25px -5px rgba(0,0,0,0.5), 0 10px 10px -5px rgba(0,0,0,0.2)',
  'shadow-sidebar-glow': '0 0 20px rgba(0,0,0,0.3)',
  'shadow-appbar': '0 1px 3px 0 rgba(0,0,0,0.3)',
  'shadow-light': '0 2px 4px rgba(0,0,0,0.2)',
  'shadow-medium': '0 4px 12px rgba(0,0,0,0.3)',
  'shadow-strong': '0 8px 30px rgba(0,0,0,0.4)',

  // Layout
  'bg-content': p.neutral[950],
  'text-appbar': p.slate[100],
  'border-logo-divider': 'rgba(255,255,255,0.05)',

 // Motion
 'ease-out': p.easing.easeOut,
 'duration-normal': p.duration.normal,

 // Message bubbles
 'message-left-bg': p.neutral[900],
 'message-right-bg': p.emerald[900],
 'message-left-text': p.slate[100],
 'message-right-text': p.slate[100],
 'message-quote-bg': p.slate[800],
 'message-quote-text': p.slate[400],
 'message-quote-border': p.slate[700],
 'message-quote-side-left': p.blue[500],
 'message-quote-side-right': p.emerald[500],
 'message-timestamp-text': p.slate[500],
 'message-daily-bg': p.slate[800],
 'message-daily-text': p.slate[300],
 'message-reaction-bg': p.slate[800],
 'message-reaction-border': p.slate[700],
 'message-error-text': p.red[400],
 'message-ack-text': p.slate[500],

 // SaaS mode
 'message-saas-bg': p.blue[400],
 'message-saas-text': p.neutral[50],
 'message-saas-bg-alt': p.neutral[800],
};
