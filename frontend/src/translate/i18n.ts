import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { messages } from "./languages";

i18n.use(LanguageDetector).init({
	debug: false,
	defaultNS: ["translations"],
	fallbackLng: "en",
	ns: ["translations"],
	resources: messages,
	// i18next escapa valores interpolados por padrão (proteção XSS pensada para
	// templates HTML crus). Aqui os resultados de i18n.t() sempre são renderizados
	// como texto JSX puro — o React já escapa na renderização — então o escape do
	// i18next só causava entidades literais aparecendo na tela (ex: "/" virando
	// "&#x2F;" em datas interpoladas, como em publicProtocol.header.createdAt).
	interpolation: { escapeValue: false },
});

export { i18n };
