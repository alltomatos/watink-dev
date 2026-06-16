/**
 * Primitive / Global Tokens (Level 1)
 *
 * Valores brutos sem significado semântico.
 * São a paleta base — NUNCA usados diretamente em componentes.
 * Componentes devem sempre consumir Semantic Tokens (var(--semantic-name)).
 *
 * Regra: se um componente referencia primitives direto, é débito visual.
 */

export const blue = {
	50: '#E3F2FD',
	100: '#BBDEFB',
	200: '#90CAF9',
	300: '#64B5F6',
	400: '#42A5F5',
	500: '#007AFF',
	600: '#0063E6',
	700: '#1565C0',
	800: '#0D47A1',
	900: '#0A246A',
};

export const slate = {
	50: '#F8FAFC',
	100: '#F1F5F9',
	200: '#E2E8F0',
	300: '#CBD5E1',
	400: '#94A3B8',
	500: '#64748B',
	600: '#475569',
	700: '#334155',
	800: '#1E293B',
	900: '#0F172A',
	950: '#020617',
};

export const neutral = {
	0: '#FFFFFF',
	50: '#F9FAFB',
	100: '#F3F4F6',
	200: '#E5E7EB',
	300: '#D1D5DB',
	400: '#9CA3AF',
	500: '#6B7280',
	600: '#4B5563',
	700: '#374151',
	800: '#1F2937',
	900: '#111827',
	950: '#030712',
};

export const emerald = {
	50: '#ECFDF5',
	100: '#D1FAE5',
	200: '#A7F3D0',
	300: '#6EE7B7',
	400: '#34D399',
	500: '#10B981',
	600: '#059669',
	700: '#047857',
	800: '#065F46',
	900: '#064E3B',
};

export const red = {
	50: '#FEF2F2',
	100: '#FEE2E2',
	200: '#FECACA',
	300: '#FCA5A5',
	400: '#F87171',
	500: '#EF4444',
	600: '#DC2626',
	700: '#B91C1C',
	800: '#991B1B',
	900: '#7F1D1D',
};

export const amber = {
	50: '#FFFBEB',
	100: '#FEF3C7',
	200: '#FDE68A',
	300: '#FCD34D',
	400: '#FBBF24',
	500: '#F59E0B',
	600: '#D97706',
	700: '#B45309',
	800: '#92400E',
	900: '#78350F',
};

export const violet = {
	50: '#F5F3FF',
	100: '#EDE9FE',
	200: '#DDD6FE',
	300: '#C4B5FD',
	400: '#A78BFA',
	500: '#8B5CF6',
	600: '#7C3AED',
	700: '#6D28D9',
	800: '#5B21B6',
	900: '#4C1D95',
};

export const pink = {
	50: '#FDF2F8',
	100: '#FCE7F3',
	200: '#FBCFE8',
	300: '#F9A8D4',
	400: '#F472B6',
	500: '#EC4899',
	600: '#DB2777',
	700: '#BE185D',
	800: '#9D174D',
	900: '#831843',
};

export const indigo = {
	50: '#EEF2FF',
	100: '#E0E7FF',
	200: '#C7D2FE',
	300: '#A5B4FC',
	400: '#818CF8',
	500: '#3F51B5',
	600: '#3949AB',
	700: '#303F9F',
	800: '#283593',
	900: '#1A237E',
};

export const purple = {
	50: '#F3E5F5',
	100: '#E1BEE7',
	200: '#CE93D8',
	300: '#BA68C8',
	400: '#AB47BC',
	500: '#7C4DFF',
	600: '#7B1FA2',
	700: '#6A1B9A',
	800: '#4A148C',
	900: '#311B92',
};

export const google = {
	blue: '#1A73E8',
	green: '#1E8E3E',
	yellow: '#F9AB00',
	red: '#D93025',
	purple: '#7C4DFF',
	teal: '#00897B',
	orange: '#E8710A',
	pink: '#D01884',
};

/** Spacing scale (px) */
export const spacing = {
	0: '0px',
	0.5: '2px',
	1: '4px',
	1.5: '6px',
	2: '8px',
	3: '12px',
	4: '16px',
	5: '20px',
	6: '24px',
	8: '32px',
	10: '40px',
	12: '48px',
	16: '64px',
	20: '80px',
};

/** Border radius scale */
export const radius = {
	none: '0px',
	sm: '6px',
	md: '8px',
	lg: '12px',
	xl: '16px',
	'2xl': '20px',
	full: '9999px',
};

/** Elevation / Shadow scale */
export const shadow = {
	none: 'none',
	xs: '0 1px 2px 0 rgba(0,0,0,0.05)',
	sm: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
	md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
	lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
	xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
	inner: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
};

/** Transition durations */
export const duration = {
	fast: '150ms',
	normal: '200ms',
	slow: '300ms',
	slower: '500ms',
};

/** Easing curves */
export const easing = {
	easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
	easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
	easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
	sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
	spring: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
};

export const primitives = {
	blue,
	slate,
	neutral,
	emerald,
	red,
	amber,
	violet,
	pink,
	indigo,
	purple,
	google,
	spacing,
	radius,
	shadow,
	duration,
	easing,
};

export default primitives;
