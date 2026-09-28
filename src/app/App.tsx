import { useEffect, useState } from "react";

export function App() {
	const [api, setApi] = useState("checking…");

	useEffect(() => {
		fetch("/api/health")
			.then((r) => r.json() as Promise<{ ok: boolean }>)
			.then((d) => setApi(d.ok ? "API online" : "API error"))
			.catch(() => setApi("API unreachable"));
	}, []);

	return (
		<main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-8">
			<header className="rounded-2xl border border-black/10 bg-[#f7f3e6] px-10 py-3 text-center shadow-sm">
				<h1 className="text-3xl font-bold">My 9 Games</h1>
				<p className="text-sm opacity-70">The 9 Games That Shaped Who I Am</p>
			</header>
			<div className="grid w-full grid-cols-3 gap-3">
				{Array.from({ length: 9 }, (_, i) => (
					<div key={i} className="aspect-[3/4] rounded-xl bg-black/10" />
				))}
			</div>
			<p className="rounded-full bg-[#f7f3e6] px-4 py-1 text-xs font-semibold">{api}</p>
		</main>
	);
}
