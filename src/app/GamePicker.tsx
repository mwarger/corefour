import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "../shared/types.ts";
import { coverUrl } from "./covers.ts";

interface GamePickerProps {
	slotNumber: number;
	onSelect: (game: SearchResult) => void;
	onClose: () => void;
}

export function GamePicker({ slotNumber, onSelect, onClose }: GamePickerProps) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => inputRef.current?.focus(), []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	useEffect(() => {
		const q = query.trim();
		if (q.length < 2) {
			setResults([]);
			setStatus("idle");
			return;
		}
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			setStatus("loading");
			try {
				const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
					signal: controller.signal,
				});
				if (!res.ok) throw new Error(String(res.status));
				setResults((await res.json()) as SearchResult[]);
				setStatus("idle");
			} catch (err) {
				if (!controller.signal.aborted) setStatus("error");
			}
		}, 250);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [query]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh] backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-label={`Choose game #${slotNumber}`}
				className="flex max-h-[75vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-cream shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<form
					className="border-b border-ink/10 p-3"
					onSubmit={(e) => {
						e.preventDefault();
						if (results[0]) onSelect(results[0]);
					}}
				>
					<input
						ref={inputRef}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={`Search for game #${slotNumber}…`}
						className="w-full rounded-lg bg-white px-4 py-3 text-base text-ink outline-none ring-ink/20 focus:ring-2"
					/>
				</form>
				<ul className="overflow-y-auto p-2">
					{results.map((game) => (
						<li key={game.id}>
							<button
								type="button"
								onClick={() => onSelect(game)}
								className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left hover:bg-ink/5 focus:bg-ink/5 focus:outline-none"
							>
								<img
									src={coverUrl(game.imageId, "cover_small")}
									alt=""
									loading="lazy"
									className="h-16 w-12 shrink-0 rounded object-cover shadow"
								/>
								<span className="min-w-0">
									<span className="block truncate font-semibold text-ink">
										{game.name}
									</span>
									<span className="block truncate text-sm text-ink/60">
										{resultDetails(game)}
									</span>
								</span>
							</button>
						</li>
					))}
					{status === "loading" && results.length === 0 && (
						<li className="p-4 text-center text-ink/60">Searching…</li>
					)}
					{status === "error" && (
						<li className="p-4 text-center text-red-700">
							Search failed. Try again in a moment.
						</li>
					)}
					{status === "idle" && query.trim().length >= 2 && results.length === 0 && (
						<li className="p-4 text-center text-ink/60">No games found.</li>
					)}
				</ul>
			</div>
		</div>
	);
}

const MAX_PLATFORMS = 4;

/** e.g. "1998 · Remake · N64, 3DS, Switch +2" */
function resultDetails({ year, kind, platforms }: SearchResult): string {
	const shown = platforms.slice(0, MAX_PLATFORMS).join(", ");
	const more = platforms.length > MAX_PLATFORMS ? ` +${platforms.length - MAX_PLATFORMS}` : "";
	return [year, kind, shown && shown + more].filter(Boolean).join(" · ");
}
