import React from 'react';

// Inject component styles once
function injectButtonStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('wt-button-css')) return;
  const s = document.createElement('style');
  s.id = 'wt-button-css';
  s.textContent = `
    .wt-btn {
      font-family: var(--font-primary, 'Inter', sans-serif);
      border: none;
      outline: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-weight: 600;
      letter-spacing: var(--tracking-snug, -0.01em);
      transition: all var(--duration-fast, 150ms) var(--ease-out, cubic-bezier(0,0,0.2,1));
      text-decoration: none;
      white-space: nowrap;
      line-height: 1;
    }
    .wt-btn:focus-visible {
      outline: 2px solid var(--action-primary, #1A73E8);
      outline-offset: 2px;
    }
    .wt-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* Variants */
    .wt-btn--primary {
      background: var(--button-primary-bg, #1A73E8);
      color: var(--button-primary-text, #fff);
    }
    .wt-btn--primary:hover:not(:disabled) {
      background: var(--action-primary-hover, #0063E6);
      transform: translateY(-1px);
      box-shadow: 0 4px 14px var(--status-info-30, rgba(26,115,232,0.3));
    }
    .wt-btn--primary:active:not(:disabled) {
      transform: scale(0.97) translateY(0);
      box-shadow: none;
    }

    .wt-btn--outlined {
      background: transparent;
      color: var(--action-primary, #1A73E8);
      border: 1.5px solid var(--action-primary, #1A73E8);
    }
    .wt-btn--outlined:hover:not(:disabled) {
      background: var(--action-primary-bg, #E3F2FD);
    }

    .wt-btn--ghost {
      background: transparent;
      color: var(--text-primary, #111827);
    }
    .wt-btn--ghost:hover:not(:disabled) {
      background: var(--bg-surface-alt, #F1F5F9);
    }

    .wt-btn--danger {
      background: var(--status-error, #EF4444);
      color: #fff;
    }
    .wt-btn--danger:hover:not(:disabled) {
      background: var(--status-error-text, #991B1B);
      transform: translateY(-1px);
    }

    /* Sizes */
    .wt-btn--sm  { padding: 6px 14px;  font-size: 0.8125rem; border-radius: var(--radius-md, 8px);  min-height: 32px; }
    .wt-btn--md  { padding: 8px 20px;  font-size: 0.9375rem; border-radius: var(--radius-lg, 12px); min-height: 40px; }
    .wt-btn--lg  { padding: 12px 28px; font-size: 1rem;      border-radius: var(--radius-lg, 12px); min-height: 48px; }
    .wt-btn--full { width: 100%; }

    .wt-btn-icon { display: flex; align-items: center; flex-shrink: 0; }
  `;
  document.head.appendChild(s);
}

/**
 * Botão de ação principal do Watink.
 * Use `primary` para o CTA principal, `outlined` para ações secundárias,
 * `ghost` para ações terciárias ou em nível de navegação.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon = null,
  trailingIcon = null,
  onClick,
  type = 'button',
  fullWidth = false,
  style,
  className = '',
  ...props
}) {
  React.useEffect(() => { injectButtonStyles(); }, []);

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={[
        'wt-btn',
        `wt-btn--${variant}`,
        `wt-btn--${size}`,
        fullWidth ? 'wt-btn--full' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {icon && <span className="wt-btn-icon">{icon}</span>}
      {children}
      {trailingIcon && <span className="wt-btn-icon">{trailingIcon}</span>}
    </button>
  );
}

export default Button;
