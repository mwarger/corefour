// Site keys are public. In dev, use Cloudflare's invisible test key, which
// always passes (paired with the test secret in .dev.vars).
const SITE_KEY = import.meta.env.DEV ? "1x00000000000000000000BB" : "0x4AAAAAAFIOBx02cnhc0Puz";

interface Turnstile {
	render(
		el: HTMLElement,
		options: {
			sitekey: string;
			callback: (token: string) => void;
			"error-callback": () => void;
			"expired-callback": () => void;
		},
	): string;
	remove(widgetId: string): void;
}

declare global {
	interface Window {
		turnstile?: Turnstile;
	}
}

let scriptLoad: Promise<Turnstile> | undefined;

function loadTurnstile(): Promise<Turnstile> {
	scriptLoad ??= new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
		script.async = true;
		script.onload = () => resolve(window.turnstile!);
		script.onerror = () => {
			scriptLoad = undefined;
			reject(new Error("Couldn't load verification. Check your connection and try again."));
		};
		document.head.appendChild(script);
	});
	return scriptLoad;
}

/** Runs an invisible Turnstile challenge and resolves with a single-use token. */
export async function getTurnstileToken(): Promise<string> {
	const turnstile = await loadTurnstile();
	const el = document.createElement("div");
	el.hidden = true;
	document.body.appendChild(el);
	let widgetId: string | undefined;
	try {
		return await new Promise<string>((resolve, reject) => {
			const fail = () => reject(new Error("Couldn't verify you're human. Please try again."));
			widgetId = turnstile.render(el, {
				sitekey: SITE_KEY,
				callback: resolve,
				"error-callback": fail,
				"expired-callback": fail,
			});
		});
	} finally {
		if (widgetId) turnstile.remove(widgetId);
		el.remove();
	}
}
