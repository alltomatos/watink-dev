import React from 'react';

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
export function Avatar({
  src,
  name,
  size = 'md',
  online,
  style,
  className = '',
  ...props
}) {
  const [imgError, setImgError] = React.useState(false);
  React.useEffect(() => { injectAvatarStyles(); }, []);

  const initials = name
    ? name.trim().split(/\s+/).map(function(w) { return w[0]; }).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div
      className={['wt-avatar', `wt-avatar--${size}`, className].filter(Boolean).join(' ')}
      title={name}
      style={style}
      {...props}
    >
      {src && !imgError ? (
        <img src={src} alt={name || ''} onError={function() { setImgError(true); }} />
      ) : (
        <span>{initials}</span>
      )}
      {online !== undefined && (
        <div className={['wt-avatar-status', !online ? 'wt-avatar-status--offline' : ''].filter(Boolean).join(' ')} />
      )}
    </div>
  );
}

export default Avatar;
