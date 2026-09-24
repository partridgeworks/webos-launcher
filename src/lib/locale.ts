// The TV's UI language, used to pick the string table (see lib/strings.ts).
// Reads the locale from the system service; falls back to navigator.language off-webOS
// or if the TV doesn't answer. Result is cached: the locale is read once per app run.

import {LUNA} from '../config/constants';
import {isWebOS, lunaCall, type LunaResponse} from './luna';
import {DEFAULT_LOCALE, localeFrom, type Locale} from './strings';

interface LocaleInfo {
	locale?: string;
	locales?: {
		UI?: string;
	};
}

interface PreferencesResponse extends LunaResponse {
	localeInfo?: LocaleInfo;
}

function fallbackLocale (): Locale {
	const nav = typeof navigator === 'undefined' ? '' : (navigator.language || '');
	return localeFrom(nav || DEFAULT_LOCALE);
}

export function getUiLocale (): Promise<Locale> {
	if (!isWebOS()) return Promise.resolve(fallbackLocale());
	return lunaCall<PreferencesResponse>(LUNA.preferences, {keys: ['localeInfo']})
		.then((r): Locale => {
			const info = r.localeInfo;
			const tag = (info && info.locales && info.locales.UI) || (info && info.locale) || '';
			return tag ? localeFrom(tag) : fallbackLocale();
		})
		.catch(() => fallbackLocale());
}

let cached: Locale | null = null;

/** getUiLocale, answered from cache after the first successful read. */
export function getUiLocaleCached (): Promise<Locale> {
	if (cached) return Promise.resolve(cached);
	return getUiLocale().then((locale) => { cached = locale; return locale; });
}
