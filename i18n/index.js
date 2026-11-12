const files = import.meta.glob("./JSON/*.json", {
	eager: true,
	import: "default",
});
const flags = import.meta.glob("./SVG/*.svg", {
	eager: true,
	import: "default",
	query: "?url",
});
const fonts = import.meta.glob("./FONTS/*.{woff2,woff,ttf,otf}", {
	eager: true,
	import: "default",
	query: "?url",
});
const fontExtensions = ["woff2", "woff", "ttf", "otf"];
const registeredFonts = new Set();
const languages = new Map(
	Object.entries(files).map(([path, language]) => {
		const code = path.slice("./JSON/".length, -".json".length);
		return [code.toLowerCase(), { ...language, code }];
	}),
);
const english = languages.get("en");
const cookieName = "xavatar_language";
const placeholder = /\{(\w+)\}/g;
const translatedAttributes = ["aria-label", "title"];
let language = english;
let plurals;
let numbers;

function preferredLanguage() {
	const saved = document.cookie
		.split(";")
		.map((entry) => entry.trim())
		.find((entry) => entry.startsWith(`${cookieName}=`))
		?.slice(cookieName.length + 1);
	if (languages.has(saved)) return languages.get(saved);

	for (const preference of navigator.languages?.length
		? navigator.languages
		: [navigator.language]) {
		const parts = preference.toLowerCase().split("-");
		while (parts.length) {
			const supported = languages.get(parts.join("-"));
			if (supported) return supported;
			parts.pop();
		}
	}
	return english;
}

function saveLanguage() {
	const path = new URL(".", location.href).pathname;
	const secure = location.protocol === "https:" ? "; Secure" : "";
	// biome-ignore lint/suspicious/noDocumentCookie: support browsers without Cookie Store.
	document.cookie = `${cookieName}=${language.code.toLowerCase()}; Path=${path}; Max-Age=31536000; SameSite=Lax${secure}`;
}

function messagePattern(key, count) {
	const translated = language.messages[key];
	const fallback = english.messages[key];
	if (typeof translated === "string") return translated;
	if (translated) return translated[plurals.select(count)] ?? translated.other;
	if (typeof fallback === "string") return fallback;
	return (count === 1 ? fallback?.one : fallback?.other) ?? key;
}

export function t(key, values = {}) {
	return messagePattern(key, values.count).replace(
		placeholder,
		(token, name) => {
			const value = values[name];
			return typeof value === "number"
				? numbers.format(value)
				: (value ?? token);
		},
	);
}

export function isolate(text) {
	return `\u2068${text}\u2069`;
}

export function translate(root) {
	for (const element of root.querySelectorAll("[data-i18n]")) {
		const slots = new Map(
			Array.from(element.children)
				.filter((child) => child.hasAttribute("data-i18n-slot"))
				.map((child) => [child.dataset.i18nSlot, child]),
		);
		const pattern = messagePattern(element.dataset.i18n);
		if (slots.size) {
			const parts = pattern.split(placeholder);
			element.replaceChildren(
				...parts.map((part, index) =>
					index % 2 ? (slots.get(part) ?? `{${part}}`) : part,
				),
			);
		} else if (element.textContent !== pattern) {
			element.textContent = pattern;
		}
	}
	for (const attribute of translatedAttributes) {
		const marker = `data-i18n-${attribute}`;
		for (const element of root.querySelectorAll(`[${marker}]`)) {
			element.setAttribute(attribute, t(element.getAttribute(marker)));
		}
	}
}

function setFlag(image, choice) {
	const url = flags[`./${choice.flag}`];
	image.hidden = !url;
	if (url) image.src = url;
	else image.removeAttribute("src");
}

function setLocaleFont(root, code) {
	const file = fontExtensions
		.map((extension) => `./FONTS/${code}.${extension}`)
		.find((path) => fonts[path]);
	if (!file) {
		root.style.removeProperty("--locale-font");
		return;
	}
	const family = `XAVATAR ${code}`;
	if (!registeredFonts.has(code)) {
		document.fonts.add(
			new FontFace(family, `url(${JSON.stringify(fonts[file])})`, {
				display: "swap",
			}),
		);
		registeredFonts.add(code);
	}
	root.style.setProperty("--locale-font", JSON.stringify(family));
}

export function initLanguagePicker(onChange) {
	const picker = document.querySelector(".language-picker");
	const toggle = document.getElementById("language-toggle");
	const panel = document.getElementById("language-options");
	const list = document.getElementById("language-list");
	const current = document.getElementById("current-language");
	const options = new Map();

	function setOpen(open) {
		panel.hidden = !open;
		toggle.setAttribute("aria-expanded", String(open));
	}

	function apply(choice, remember = false) {
		language = choice;
		plurals = new Intl.PluralRules(choice.code);
		numbers = new Intl.NumberFormat(choice.code, { useGrouping: false });
		const root = document.documentElement;
		root.lang = choice.code;
		root.dir = choice.direction;
		setLocaleFont(root, choice.code);
		current.textContent = choice.name;
		current.lang = choice.code;
		current.dir = choice.direction;
		toggle.setAttribute(
			"aria-label",
			`${t("language.choose")}: ${choice.name}`,
		);
		setFlag(toggle.querySelector("img"), choice);
		for (const [option, button] of options) {
			if (option === choice) button.setAttribute("aria-current", "true");
			else button.removeAttribute("aria-current");
		}
		if (remember) saveLanguage();
		translate(document);
		onChange();
	}

	for (const choice of [
		english,
		...[...languages.values()].filter((item) => item !== english),
	]) {
		const item = document.createElement("li");
		const button = document.createElement("button");
		const flag = document.createElement("img");
		const name = document.createElement("span");
		button.type = "button";
		button.className = "language-option";
		button.lang = choice.code;
		flag.className = "language-flag";
		flag.alt = "";
		setFlag(flag, choice);
		name.textContent = choice.name;
		name.dir = choice.direction;
		button.append(flag, name);
		item.append(button);
		list.append(item);
		options.set(choice, button);
		button.addEventListener("click", () => {
			apply(choice, true);
			setOpen(false);
			toggle.focus();
		});
	}

	toggle.addEventListener("click", () => setOpen(panel.hidden));
	picker.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" || panel.hidden) return;
		setOpen(false);
		toggle.focus();
	});
	picker.addEventListener("focusout", (event) => {
		if (!picker.contains(event.relatedTarget)) setOpen(false);
	});
	document.addEventListener("click", (event) => {
		if (!picker.contains(event.target)) setOpen(false);
	});
	apply(preferredLanguage());
	picker.hidden = false;
}
