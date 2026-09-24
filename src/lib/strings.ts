// UI strings. English is the fallback; Spanish is picked when the TV's UI locale is es-*.
// Templates use {placeholders} filled with the tiny `fill` helper below (no runtime deps,
// and no ES2020 syntax: the TV engine is Chrome 79).

export interface Strings {
	greetingMorning: string;
	greetingAfternoon: string;
	greetingEvening: string;
	days: string[];
	months: string[];
	/** "{day} {month}" -> "23 September" / "{day} de {month}" -> "23 de septiembre" */
	dateTemplate: string;
	rowApps: string;
	rowSources: string;
	rowMore: string;
	emptyApps: string;
	emptySources: string;
	lgHome: string;
	settings: string;
	tabApps: string;
	tabSources: string;
	nounApps: string;
	nounSources: string;
	options: string;
	hintSelect: string;
	hintReorder: string;
	hintHolding: string;
	hintOptions: string;
	settingsTitle: string;
	done: string;
	/** "{noun}" is nounApps / nounSources */
	reorderTemplate: string;
	nothingOnHome: string;
	optionUseHomebrew: string;
	optionUseHomebrewDesc: string;
	toastHomebrewUnavailable: string;
	toastAppListFailed: string;
	toastInputsFailed: string;
	/** "{label}" is the app or input name */
	toastOpenFailed: string;
	toastLgHomeFailed: string;
}

export const EN: Strings = {
	greetingMorning: 'Good morning',
	greetingAfternoon: 'Good afternoon',
	greetingEvening: 'Good evening',
	days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
	months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
	dateTemplate: '{day} {month}',
	rowApps: 'Apps',
	rowSources: 'Sources',
	rowMore: 'More',
	emptyApps: 'No apps selected — add some in Settings',
	emptySources: 'No sources selected',
	lgHome: 'LG Home',
	settings: 'Settings',
	tabApps: 'Apps',
	tabSources: 'Sources',
	nounApps: 'apps',
	nounSources: 'sources',
	options: 'Options',
	hintSelect: 'OK adds or removes an item · Hold OK to re-order · Back returns home',
	hintReorder: 'OK picks up an item · Hold OK or choose Done to finish',
	hintHolding: 'Arrows move it · OK puts it down · Back cancels',
	hintOptions: 'OK turns an option on or off · Back returns home',
	settingsTitle: 'Settings',
	done: 'Done',
	reorderTemplate: 'Re-order {noun}',
	nothingOnHome: 'Nothing on the home screen yet.',
	optionUseHomebrew: 'Live app list via Homebrew Channel',
	optionUseHomebrewDesc: 'Rooted TVs only. Lists every installed app with its real icon, using the Homebrew Channel, which runs commands as root. When off, the built-in app catalogue is used.',
	toastHomebrewUnavailable: 'Homebrew Channel not available, using the built-in app list',
	toastAppListFailed: 'Could not read the app list',
	toastInputsFailed: 'Could not read the inputs',
	toastOpenFailed: "Couldn't open {label}",
	toastLgHomeFailed: "Couldn't open LG Home"
};

export const ES: Strings = {
	greetingMorning: 'Buenos días',
	greetingAfternoon: 'Buenas tardes',
	greetingEvening: 'Buenas noches',
	days: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
	months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
	dateTemplate: '{day} de {month}',
	rowApps: 'Apps',
	rowSources: 'Fuentes',
	rowMore: 'Más',
	emptyApps: 'No hay apps seleccionadas - añade alguna en Ajustes',
	emptySources: 'No hay fuentes seleccionadas',
	lgHome: 'LG Home',
	settings: 'Ajustes',
	tabApps: 'Apps',
	tabSources: 'Fuentes',
	nounApps: 'apps',
	nounSources: 'fuentes',
	options: 'Opciones',
	hintSelect: 'OK añade o quita un elemento · mantén OK para reordenar · Back vuelve a inicio',
	hintReorder: 'OK recoge un elemento · mantén OK o elige Terminar para finalizar',
	hintHolding: 'Las flechas lo mueven · OK lo suelta · Back cancela',
	hintOptions: 'OK activa o desactiva una opción · Back vuelve a inicio',
	settingsTitle: 'Ajustes',
	done: 'Terminar',
	reorderTemplate: 'Reordenar {noun}',
	nothingOnHome: 'Aún no hay nada en la pantalla de inicio.',
	optionUseHomebrew: 'Lista de apps en vivo vía Homebrew Channel',
	optionUseHomebrewDesc: 'Solo TVs rooteadas. Lista todas las apps instaladas con su icono real usando el Homebrew Channel, que ejecuta comandos como root. Si está desactivado, se usa el catálogo integrado.',
	toastHomebrewUnavailable: 'Homebrew Channel no disponible, usando la lista de apps integrada',
	toastAppListFailed: 'No se pudo leer la lista de apps',
	toastInputsFailed: 'No se pudieron leer las entradas',
	toastOpenFailed: 'No se pudo abrir {label}',
	toastLgHomeFailed: 'No se pudo abrir LG Home'
};

export type Locale = 'en' | 'es';

export const DEFAULT_LOCALE: Locale = 'en';

/** Only es-* maps to Spanish; everything else falls back to English. */
export function localeFrom (tag: string): Locale {
	return tag.toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
}

export function stringsFor (locale: Locale): Strings {
	return locale === 'es' ? ES : EN;
}

/** Fill "{name}" placeholders; extra values are ignored, missing ones stay as-is. */
export function fill (template: string, values: Record<string, string>): string {
	return template.replace(/\{(\w+)\}/g, (match, name) => (Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match));
}
