/* @ds-bundle: {"format":3,"namespace":"WatinkDesignSystem_9345f8","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"MetricCard","sourcePath":"components/core/MetricCard.jsx"},{"name":"StatusChip","sourcePath":"components/core/StatusChip.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"22a2bc8123eb","components/core/Button.jsx":"e086da10ef8e","components/core/Card.jsx":"4937262672b2","components/core/MetricCard.jsx":"5368225b3155","components/core/StatusChip.jsx":"3abbbee45664"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.WatinkDesignSystem_9345f8 = window.WatinkDesignSystem_9345f8 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function injectAvatarStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('wt-avatar-css')) return;
  const s = document.createElement('style');
  s.id = 'wt-avatar-css';
  s.textContent = `
    .wt-avatar {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      background: var(--action-primary-bg, #E3F2FD);
      color: var(--action-primary, #1A73E8);
      font-family: var(--font-primary, 'Inter', sans-serif);
      font-weight: 700;
      flex-shrink: 0;
      overflow: hidden;
      user-select: none;
    }
    .wt-avatar img {
      width: 100%; height: 100%; object-fit: cover; display: block;
    }
    .wt-avatar--xs { width: 24px; height: 24px; font-size: 0.5625rem; }
    .wt-avatar--sm { width: 32px; height: 32px; font-size: 0.6875rem; }
    .wt-avatar--md { width: 40px; height: 40px; font-size: 0.875rem;  }
    .wt-avatar--lg { width: 48px; height: 48px; font-size: 1.0625rem; }
    .wt-avatar--xl { width: 64px; height: 64px; font-size: 1.375rem;  }
    .wt-avatar-status {
      position: absolute;
      bottom: 1px; right: 1px;
      width: 9px; height: 9px;
      border-radius: 50%;
      border: 2px solid var(--bg-surface, #fff);
      background: var(--status-success, #10B981);
    }
    .wt-avatar-status--offline { background: var(--text-muted, #94A3B8); }
  `;
  document.head.appendChild(s);
}

/**
 * Avatar de usuário — imagem com fallback de iniciais, ponto de status online, múltiplos tamanhos.
 */
function Avatar({
  src,
  name,
  size = 'md',
  online,
  style,
  className = '',
  ...props
}) {
  const [imgError, setImgError] = React.useState(false);
  React.useEffect(() => {
    injectAvatarStyles();
  }, []);
  const initials = name ? name.trim().split(/\s+/).map(function (w) {
    return w[0];
  }).slice(0, 2).join('').toUpperCase() : '?';
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['wt-avatar', `wt-avatar--${size}`, className].filter(Boolean).join(' '),
    title: name,
    style: style
  }, props), src && !imgError ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name || '',
    onError: function () {
      setImgError(true);
    }
  }) : /*#__PURE__*/React.createElement("span", null, initials), online !== undefined && /*#__PURE__*/React.createElement("div", {
    className: ['wt-avatar-status', !online ? 'wt-avatar-status--offline' : ''].filter(Boolean).join(' ')
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Button({
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
  React.useEffect(() => {
    injectButtonStyles();
  }, []);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    style: style,
    className: ['wt-btn', `wt-btn--${variant}`, `wt-btn--${size}`, fullWidth ? 'wt-btn--full' : '', className].filter(Boolean).join(' ')
  }, props), icon && /*#__PURE__*/React.createElement("span", {
    className: "wt-btn-icon"
  }, icon), children, trailingIcon && /*#__PURE__*/React.createElement("span", {
    className: "wt-btn-icon"
  }, trailingIcon));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Card({
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
  React.useEffect(() => {
    injectCardStyles();
  }, []);
  const hasHeader = title || icon || actions;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['wt-card', hoverEffect ? 'wt-card--hover' : '', onClick ? 'wt-card--clickable' : '', className].filter(Boolean).join(' '),
    onClick: onClick,
    style: style
  }, props), /*#__PURE__*/React.createElement("div", {
    className: "wt-card-content",
    style: padding ? {
      padding
    } : undefined
  }, hasHeader && /*#__PURE__*/React.createElement("div", {
    className: "wt-card-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wt-card-header-left"
  }, icon && /*#__PURE__*/React.createElement("div", {
    className: "wt-card-icon",
    style: {
      backgroundColor: iconColor || 'var(--status-info-8, rgba(26,115,232,0.08))'
    }
  }, icon), (title || subtitle) && /*#__PURE__*/React.createElement("div", null, title && /*#__PURE__*/React.createElement("div", {
    className: "wt-card-title"
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    className: "wt-card-subtitle"
  }, subtitle))), actions && /*#__PURE__*/React.createElement("div", null, actions)), children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/MetricCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
    bg: 'linear-gradient(135deg, var(--status-info-4) 0%, var(--status-info-15) 100%)',
    icon: 'var(--status-info, #1A73E8)',
    text: 'var(--status-info, #1A73E8)'
  },
  success: {
    bg: 'linear-gradient(135deg, var(--status-success-10) 0%, var(--status-success-bg) 100%)',
    icon: 'var(--status-success, #10B981)',
    text: 'var(--status-success, #10B981)'
  },
  warning: {
    bg: 'linear-gradient(135deg, var(--status-warning-bg) 0%, rgba(245,158,11,0.15) 100%)',
    icon: 'var(--status-warning, #F59E0B)',
    text: 'var(--status-warning, #F59E0B)'
  },
  error: {
    bg: 'linear-gradient(135deg, var(--status-error-10) 0%, var(--status-error-bg) 100%)',
    icon: 'var(--status-error, #EF4444)',
    text: 'var(--status-error, #EF4444)'
  },
  info: {
    bg: 'linear-gradient(135deg, var(--status-info-4) 0%, var(--status-info-15) 100%)',
    icon: 'var(--status-info, #1A73E8)',
    text: 'var(--status-info, #1A73E8)'
  }
};

/**
 * Card de métrica para dashboard — número grande, rótulo em MAIÚSCULAS, ícone opcional com gradiente, badge de tendência opcional.
 * Corresponde ao componente MetricCard usado nos widgets PerformanceMetrics e TicketsInfo.
 */
function MetricCard({
  label,
  value,
  icon = null,
  color = 'primary',
  trend,
  style,
  className = '',
  ...props
}) {
  React.useEffect(() => {
    injectMetricStyles();
  }, []);
  const c = COLOR_MAP[color] || COLOR_MAP.primary;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['wt-metric', className].filter(Boolean).join(' '),
    style: style
  }, props), icon && /*#__PURE__*/React.createElement("div", {
    className: "wt-metric-icon",
    style: {
      background: c.bg
    }
  }, React.isValidElement(icon) ? React.cloneElement(icon, {
    style: {
      ...(icon.props.style || {}),
      color: c.icon,
      width: 28,
      height: 28,
      fontSize: 28
    }
  }) : icon), /*#__PURE__*/React.createElement("div", {
    className: "wt-metric-label"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "wt-metric-value",
    style: {
      color: c.text
    }
  }, value), trend && /*#__PURE__*/React.createElement("div", {
    className: `wt-metric-trend wt-metric-trend--${trend.positive ? 'up' : 'down'}`
  }, trend.positive ? '↑' : '↓', " ", trend.value));
}
Object.assign(__ds_scope, { MetricCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/MetricCard.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function StatusChip({
  status = 'default',
  label,
  size = 'md',
  dot = true,
  style,
  className = '',
  ...props
}) {
  React.useEffect(() => {
    injectChipStyles();
  }, []);
  return /*#__PURE__*/React.createElement("span", _extends({
    className: [`wt-chip wt-chip--${status} wt-chip--${size}`, className].filter(Boolean).join(' '),
    style: style
  }, props), dot && /*#__PURE__*/React.createElement("span", {
    className: "wt-chip-dot"
  }), label);
}
Object.assign(__ds_scope, { StatusChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusChip.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.MetricCard = __ds_scope.MetricCard;

__ds_ns.StatusChip = __ds_scope.StatusChip;

})();
