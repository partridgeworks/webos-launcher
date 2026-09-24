// Time-of-day text. Pure functions so they are trivially testable.
// Day, month and greeting words come from the active string table (lib/strings.ts).

import type {Strings} from './strings';
import {fill} from './strings';

export type TimeFormat = '12h' | '24h';

export function greeting (date: Date, s: Strings): string {
	const h = date.getHours();
	if (h < 12) return s.greetingMorning;
	if (h < 18) return s.greetingAfternoon;
	return s.greetingEvening;
}

export function dayName (date: Date, s: Strings): string {
	return s.days[date.getDay()];
}

/** "23 September" / "23 de septiembre" */
export function dateText (date: Date, s: Strings): string {
	return fill(s.dateTemplate, {day: String(date.getDate()), month: s.months[date.getMonth()]});
}

export interface TimeParts {
	/** "15:42" or "3:42" */
	time: string;
	/** "AM" / "PM" in 12-hour format, otherwise empty */
	period: string;
}

export function timeParts (date: Date, format: TimeFormat): TimeParts {
	const h = date.getHours();
	const m = pad(date.getMinutes());
	if (format === '24h') return {time: `${pad(h)}:${m}`, period: ''};
	return {time: `${h % 12 || 12}:${m}`, period: h < 12 ? 'AM' : 'PM'};
}

function pad (n: number): string {
	return n < 10 ? `0${n}` : String(n);
}
