import React from 'react';

function injectChipStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('wt-chip-css')) return;
  const s = document.createElement('style');
  s.id = 'wt-chip-css';
  s.textContent = `
    .wt-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-family: var(--font-primary, 'Inter', sans-serif);
      font-weight: 600;
      border-radius: var(--radius-full, 9999px);
      line-height: 1;
    }
    .wt-chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    /* Sizes */
    .wt-chip--sm { padding: 2px 8px;  font-size: 0.6875rem; }
    .wt-chip--md { padding: 4px 10px; font-size: 0.75rem;   }
    .wt-chip--lg { padding: 6px 14px; font-size: 0.875rem;  }
    /* Status variants */
    .wt-chip--success { background: var(--status-success-bg, #ECFDF5); color: var(--status-success-text, #065F46); }
    .wt-chip--success .wt-chip-dot { background: var(--status-success, #10B981); }
    .wt-chip--error   { background: var(--status-error-bg,   #FEF2F2); color: var(--status-error-text,   #991B1B); }
    .wt-chip--error .wt-chip-dot   { background: var(--status-error,   #EF4444); }
    .wt-chip--warning { background: var(--status-warning-bg, #FFFBEB); color: var(--status-warning-text, #92400E); }
    .wt-chip--warning .wt-chip-dot { background: var(--status-warning, #F59E0B); }
    .wt-chip--info    { background: var(--status-info-bg,    #EFF6FF); color: var(--status-info-text,    #0D47A1); }
    .wt-chip--info .wt-chip-dot    { background: var(--status-info,    #1A73E8); }
    .wt-chip--default { background: var(--status-default-bg, #F3F4F6); color: var(--status-default-text, #6B7280); }
    .wt-chip--default .wt-chip-dot { background: var(--text-muted,     #94A3B8); }
  `;
  document.head.appendChild(s);
}

/**
 * Chip semântico de status — mapeia nomes de status para cores de fundo + texto baseadas em tokens.
 * Use para status de tickets, status de conexões, indicadores de prioridade, estado de filas, etc.
 */
export function StatusChip({
  status = 'default',
  label,
  size = 'md',
  dot = true,
  style,
  className = '',
  ...props
}) {
  React.useEffect(() => { injectChipStyles(); }, []);

  return (
    <span
      className={[`wt-chip wt-chip--${status} wt-chip--${size}`, className].filter(Boolean).join(' ')}
      style={style}
      {...props}
    >
      {dot && <span className="wt-chip-dot" />}
      {label}
    </span>
  );
}

export default StatusChip;
