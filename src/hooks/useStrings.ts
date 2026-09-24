import {useEffect, useState} from 'preact/hooks';
import {getUiLocaleCached} from '../lib/locale';
import {DEFAULT_LOCALE, stringsFor, type Strings} from '../lib/strings';

/** The string table matching the TV's UI language. English until the locale answer arrives. */
export function useStrings (): Strings {
	const [locale, setLocale] = useState(DEFAULT_LOCALE);
	useEffect(() => {
		let alive = true;
		getUiLocaleCached().then((l) => { if (alive) setLocale(l); });
		return () => { alive = false; };
	}, []);
	return stringsFor(locale);
}
