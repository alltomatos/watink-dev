import React from 'react';

function injectCardStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('wt-card-css')) return;
  const s = document.createElement('style');
  s.id = 'wt-card-css';
  s.textContent = `
    .wt-card {
      background: var(--card-bg, var(--bg-surface, #fff));
      border-radius: var(--card-border-radius, 16px);
      box-shadow: 0px 4px 20px rgba(0,0,0,0.08);
      transition: var(--transition-card, all 300ms cubic-bezier(.25,.8,.25,1));
      position: relative;
      overflow: hidden;
    }
    .wt-card--hover:hover {
      transform: translateY(-6px);
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.10), 0 10px 10px -5px rgba(0,0,0,0.04);
    }
    .wt-card--clickable { cursor: pointer; }
    .wt-card-content { padding: 24px; }
    .wt-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .wt-card-header-left { display: flex; align-items: center; gap: 16px; }
    .wt-card-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg, 12px);
      flex-shrink: 0;
    }
    .wt-card-title {
      font-family: var(--font-primary, 'Inter', sans-serif);
      font-weight: 700;
      font-size: var(--text-xl, 1.125rem);
      color: var(--text-primary, #111827);
      line-height: var(--leading-tight, 1.2);
      letter-spacing: var(--tracking-snug, -0.01em);
    }
    .wt-card-subtitle {
      font-family: var(--font-primary, 'Inter', sans-serif);
      font-size: var(--text-body-sm, 0.875rem);
      color: var(--text-secondary, #64748B);
      margin-top: 3px;
    }
  `;
  document.head.appendChild(s);
}

/**
 * Card de conteúdo base — superfície branca com header opcional (título, ícone, ações) e slot de corpo.
 * Corresponde ao componente BaseCard usado em todo o dashboard do Watink.
 */
export function Card({
  title,
  subtitle,
  icon,
  iconColor,
  actions,
  hoverEffect = false,
  onClick,
  children,
  style,
  className = '',
  padding,
  ...props
}) {
  React.useEffect(() => { injectCardStyles(); }, []);

  const hasHeader = title || icon || actions;

  return (
    <div
      className={[
        'wt-card',
        hoverEffect ? 'wt-card--hover' : '',
        onClick ? 'wt-card--clickable' : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      style={style}
      {...props}
    >
      <div className="wt-card-content" style={padding ? { padding } : undefined}>
        {hasHeader && (
          <div className="wt-card-header">
            <div className="wt-card-header-left">
              {icon && (
                <div
                  className="wt-card-icon"
                  style={{ backgroundColor: iconColor || 'var(--status-info-8, rgba(26,115,232,0.08))' }}
                >
                  {icon}
                </div>
              )}
              {(title || subtitle) && (
                <div>
                  {title && <div className="wt-card-title">{title}</div>}
                  {subtitle && <div className="wt-card-subtitle">{subtitle}</div>}
                </div>
              )}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default Card;
