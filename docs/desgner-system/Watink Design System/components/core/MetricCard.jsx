import React from 'react';

function injectMetricStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('wt-metric-css')) return;
  const s = document.createElement('style');
  s.id = 'wt-metric-css';
  s.textContent = `
    .wt-metric {
      background: var(--card-bg, var(--bg-surface, #fff));
      border-radius: var(--card-border-radius, 16px);
      box-shadow: 0px 4px 20px rgba(0,0,0,0.08);
      padding: 24px;
      transition: var(--transition-card, all 300ms cubic-bezier(.25,.8,.25,1));
      overflow: visible;
    }
    .wt-metric:hover {
      transform: translateY(-6px);
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.10), 0 10px 10px -5px rgba(0,0,0,0.04);
    }
    .wt-metric-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: var(--radius-xl, 16px);
      margin-bottom: 16px;
    }
    .wt-metric-label {
      font-family: var(--font-primary, 'Inter', sans-serif);
      font-size: var(--text-xs, 0.6875rem);
      font-weight: 700;
      color: var(--text-muted, #94A3B8);
      text-transform: uppercase;
      letter-spacing: var(--tracking-caps, 0.08em);
      margin-bottom: 4px;
    }
    .wt-metric-value {
      font-family: var(--font-primary, 'Inter', sans-serif);
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: var(--tracking-tight, -0.02em);
    }
    .wt-metric-trend {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: var(--radius-full, 9999px);
      margin-top: 12px;
    }
    .wt-metric-trend--up {
      background: var(--status-success-10, rgba(16,185,129,0.1));
      color: var(--status-success, #10B981);
    }
    .wt-metric-trend--down {
      background: var(--status-error-10, rgba(239,68,68,0.1));
      color: var(--status-error, #EF4444);
    }
  `;
  document.head.appendChild(s);
}

const COLOR_MAP = {
  primary: {
    bg:   'linear-gradient(135deg, var(--status-info-4) 0%, var(--status-info-15) 100%)',
    icon: 'var(--status-info, #1A73E8)',
    text: 'var(--status-info, #1A73E8)',
  },
  success: {
    bg:   'linear-gradient(135deg, var(--status-success-10) 0%, var(--status-success-bg) 100%)',
    icon: 'var(--status-success, #10B981)',
    text: 'var(--status-success, #10B981)',
  },
  warning: {
    bg:   'linear-gradient(135deg, var(--status-warning-bg) 0%, rgba(245,158,11,0.15) 100%)',
    icon: 'var(--status-warning, #F59E0B)',
    text: 'var(--status-warning, #F59E0B)',
  },
  error: {
    bg:   'linear-gradient(135deg, var(--status-error-10) 0%, var(--status-error-bg) 100%)',
    icon: 'var(--status-error, #EF4444)',
    text: 'var(--status-error, #EF4444)',
  },
  info: {
    bg:   'linear-gradient(135deg, var(--status-info-4) 0%, var(--status-info-15) 100%)',
    icon: 'var(--status-info, #1A73E8)',
    text: 'var(--status-info, #1A73E8)',
  },
};

/**
 * Card de métrica para dashboard — número grande, rótulo em MAIÚSCULAS, ícone opcional com gradiente, badge de tendência opcional.
 * Corresponde ao componente MetricCard usado nos widgets PerformanceMetrics e TicketsInfo.
 */
export function MetricCard({
  label,
  value,
  icon = null,
  color = 'primary',
  trend,
  style,
  className = '',
  ...props
}) {
  React.useEffect(() => { injectMetricStyles(); }, []);

  const c = COLOR_MAP[color] || COLOR_MAP.primary;

  return (
    <div
      className={['wt-metric', className].filter(Boolean).join(' ')}
      style={style}
      {...props}
    >
      {icon && (
        <div className="wt-metric-icon" style={{ background: c.bg }}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon, { style: { ...(icon.props.style || {}), color: c.icon, width: 28, height: 28, fontSize: 28 } })
            : icon}
        </div>
      )}
      <div className="wt-metric-label">{label}</div>
      <div className="wt-metric-value" style={{ color: c.text }}>{value}</div>
      {trend && (
        <div className={`wt-metric-trend wt-metric-trend--${trend.positive ? 'up' : 'down'}`}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </div>
  );
}

export default MetricCard;
