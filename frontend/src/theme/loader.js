import { light, dark } from './tokens/semantic';
import { componentTokens } from './tokens/components';

const setCssVars = (tokens) => {
	const root = document.documentElement;
	Object.entries(tokens).forEach(([key, value]) => {
		root.style.setProperty(`--${key}`, value);
	});
};

export const applyThemeTokens = ({ mode = 'light', brand = {} } = {}) => {
	const semanticTokens = mode === 'dark' ? dark : light;

	setCssVars(semanticTokens);
	setCssVars(componentTokens);

	if (brand.primary) {
		document.documentElement.style.setProperty('--action-primary', brand.primary);
	}
	if (brand.primaryHover) {
		document.documentElement.style.setProperty('--action-primary-hover', brand.primaryHover);
	}
	if (brand.sidebarBg) {
		document.documentElement.style.setProperty('--bg-sidebar', brand.sidebarBg);
	}

	document.documentElement.dataset.theme = mode;
};

export default applyThemeTokens;
