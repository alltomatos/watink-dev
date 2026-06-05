import { expect, describe, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useThemeTokens } from '../useThemeTokens';

describe('useThemeTokens', () => {
  describe('getRaw', () => {
    it('returns var() for valid tokens', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.getRaw('bg-default')).toBe('var(--bg-default)');
      expect(result.current.getRaw('text-primary')).toBe('var(--text-primary)');
      expect(result.current.getRaw('action-primary')).toBe('var(--action-primary)');
    });

    it('returns null for invalid tokens', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.getRaw('invalid-token')).toBeNull();
      expect(result.current.getRaw('')).toBeNull();
      expect(result.current.getRaw(undefined)).toBeNull();
    });
  });

  describe('getVar', () => {
    it('returns var() for valid tokens', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.getVar('bg-default')).toBe('var(--bg-default)');
      expect(result.current.getVar('text-primary')).toBe('var(--text-primary)');
    });

    it('returns var(--name) for invalid tokens (lenient)', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.getVar('invalid-token')).toBe('var(--invalid-token)');
      expect(result.current.getVar('custom-override')).toBe('var(--custom-override)');
    });
  });

  describe('has', () => {
    it('returns true for existing tokens', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.has('bg-default')).toBe(true);
      expect(result.current.has('text-primary')).toBe(true);
      expect(result.current.has('action-primary')).toBe(true);
      expect(result.current.has('status-success')).toBe(true);
    });

    it('returns false for non-existing tokens', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.has('invalid-token')).toBe(false);
      expect(result.current.has('')).toBe(false);
    });
  });

  describe('groupedTokens structure', () => {
    it('contains all expected top-level groups', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.colors).toBeDefined();
      expect(result.current.layout).toBeDefined();
      expect(result.current.button).toBeDefined();
      expect(result.current.input).toBeDefined();
      expect(result.current.nav).toBeDefined();
      expect(result.current.motion).toBeDefined();
      expect(result.current.message).toBeDefined();
    });

    it('colors contains expected subgroups', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.colors.bg).toBeDefined();
      expect(result.current.colors.text).toBeDefined();
      expect(result.current.colors.action).toBeDefined();
      expect(result.current.colors.status).toBeDefined();
      expect(result.current.colors.border).toBeDefined();
      expect(result.current.colors.overlay).toBeDefined();
      expect(result.current.colors.shadow).toBeDefined();
    });

    it('colors.bg contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.colors.bg.default).toBe('var(--bg-default)');
      expect(result.current.colors.bg.surface).toBe('var(--bg-surface)');
      expect(result.current.colors.bg.sidebar).toBe('var(--bg-sidebar)');
      expect(result.current.colors.bg.appbar).toBe('var(--bg-appbar)');
    });

    it('colors.text contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.colors.text.primary).toBe('var(--text-primary)');
      expect(result.current.colors.text.secondary).toBe('var(--text-secondary)');
      expect(result.current.colors.text.muted).toBe('var(--text-muted)');
      expect(result.current.colors.text.inverse).toBe('var(--text-inverse)');
    });

    it('colors.action contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.colors.action.primary).toBe('var(--action-primary)');
      expect(result.current.colors.action.primaryHover).toBe('var(--action-primary-hover)');
      expect(result.current.colors.action.primaryActive).toBe('var(--action-primary-active)');
      expect(result.current.colors.action.primaryBg).toBe('var(--action-primary-bg)');
    });

    it('colors.status contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.colors.status.success).toBe('var(--status-success)');
      expect(result.current.colors.status.error).toBe('var(--status-error)');
      expect(result.current.colors.status.successBg).toBe('var(--status-success-bg)');
      expect(result.current.colors.status.errorBg).toBe('var(--status-error-bg)');
    });

    it('colors.border contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.colors.border.default).toBe('var(--border-default)');
      expect(result.current.colors.border.divider).toBe('var(--border-divider)');
      expect(result.current.colors.border.subtle).toBe('var(--border-subtle)');
    });

    it('colors.overlay contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.colors.overlay.light).toBe('var(--overlay-light)');
      expect(result.current.colors.overlay.medium).toBe('var(--overlay-medium)');
      expect(result.current.colors.overlay.strong).toBe('var(--overlay-strong)');
      expect(result.current.colors.overlay.dark).toBe('var(--overlay-dark)');
    });

    it('colors.shadow contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.colors.shadow.sm).toBe('var(--shadow-sm)');
      expect(result.current.colors.shadow.md).toBe('var(--shadow-md)');
      expect(result.current.colors.shadow.lg).toBe('var(--shadow-lg)');
      expect(result.current.colors.shadow.xl).toBe('var(--shadow-xl)');
    });

    it('layout contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.layout.cardBg).toBe('var(--card-bg)');
      expect(result.current.layout.sidebarWidth).toBe('var(--sidebar-width)');
      expect(result.current.layout.appbarHeight).toBe('var(--appbar-height)');
    });

    it('button contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.button.primaryBg).toBe('var(--button-primary-bg)');
      expect(result.current.button.secondaryBg).toBe('var(--button-secondary-bg)');
      expect(result.current.button.dangerBg).toBe('var(--button-danger-bg)');
    });

    it('input contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.input.padding).toBe('var(--input-padding)');
      expect(result.current.input.radius).toBe('var(--input-radius)');
      expect(result.current.input.errorBorder).toBe('var(--input-error-border)');
    });

    it('nav contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.nav.itemHeight).toBe('var(--nav-item-height)');
      expect(result.current.nav.itemRadius).toBe('var(--nav-item-radius)');
      expect(result.current.nav.activeBg).toBe('var(--nav-active-bg)');
    });

    it('motion contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.motion.easeOut).toBe('var(--ease-out)');
      expect(result.current.motion.durationNormal).toBe('var(--duration-normal)');
    });

    it('message contains expected properties', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.message.leftBg).toBe('var(--message-left-bg)');
      expect(result.current.message.rightBg).toBe('var(--message-right-bg)');
      expect(result.current.message.quoteBg).toBe('var(--message-quote-bg)');
    });
  });

  describe('TOKEN_MAP completeness', () => {
    it('contains all semantic tokens', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      // Backgrounds
      expect(result.current.has('bg-default')).toBe(true);
      expect(result.current.has('bg-surface')).toBe(true);
      expect(result.current.has('bg-sidebar')).toBe(true);
      
      // Texts
      expect(result.current.has('text-primary')).toBe(true);
      expect(result.current.has('text-secondary')).toBe(true);
      expect(result.current.has('text-muted')).toBe(true);
      
      // Actions
      expect(result.current.has('action-primary')).toBe(true);
      expect(result.current.has('action-primary-hover')).toBe(true);
      
      // Status
      expect(result.current.has('status-success')).toBe(true);
      expect(result.current.has('status-error')).toBe(true);
      expect(result.current.has('status-success-bg')).toBe(true);
      
      // Borders
      expect(result.current.has('border-default')).toBe(true);
      expect(result.current.has('border-divider')).toBe(true);
      
      // Overlays
      expect(result.current.has('overlay-light')).toBe(true);
      expect(result.current.has('overlay-medium')).toBe(true);
      
      // Shadows
      expect(result.current.has('shadow-sm')).toBe(true);
      expect(result.current.has('shadow-md')).toBe(true);
      
      // Component tokens
      expect(result.current.has('radius-md')).toBe(true);
      expect(result.current.has('spacing-md')).toBe(true);
      expect(result.current.has('card-bg')).toBe(true);
      expect(result.current.has('button-primary-bg')).toBe(true);
      expect(result.current.has('input-radius')).toBe(true);
      expect(result.current.has('nav-item-height')).toBe(true);
    });

    it('contains message-specific tokens', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      expect(result.current.has('message-left-bg')).toBe(true);
      expect(result.current.has('message-right-bg')).toBe(true);
      expect(result.current.has('message-quote-bg')).toBe(true);
      expect(result.current.has('message-error-text')).toBe(true);
    });
  });

  describe('type safety', () => {
    it('handles undefined/null gracefully', () => {
      const { result } = renderHook(() => useThemeTokens());
      
      // Should not throw
      expect(() => {
        result.current.getRaw(undefined);
        result.current.getRaw(null);
        result.current.getVar(undefined);
        result.current.getVar(null);
        result.current.has(undefined);
        result.current.has(null);
      }).not.toThrow();
    });
  });
});