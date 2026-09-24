import {dateText, dayName, timeParts, type TimeFormat} from '../lib/clock';
import {useStrings} from '../hooks/useStrings';

export function Clock ({now, format}: {now: Date; format: TimeFormat}) {
	const s = useStrings();
	const {time, period} = timeParts(now, format);
	return (
		<div class="clock">
			<div class="clock__line">{dayName(now, s)}</div>
			<div class="clock__line">{dateText(now, s)}</div>
			<div class="clock__time">
				{time}
				{period && <span class="clock__period">{period}</span>}
			</div>
		</div>
	);
}
