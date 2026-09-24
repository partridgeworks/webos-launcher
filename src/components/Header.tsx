import {greeting} from '../lib/clock';
import {useStrings} from '../hooks/useStrings';

export function Header ({now}: {now: Date}) {
	const s = useStrings();
	return (
		<header class="header">
			<h1 class="header__greeting">{greeting(now, s)}</h1>
		</header>
	);
}
