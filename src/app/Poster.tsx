import type { Game } from "../shared/types.ts";
import { coverUrl } from "./covers.ts";
import type { PosterState } from "./usePoster.ts";

interface PosterProps {
	poster: PosterState;
	onTitleChange: (field: "title" | "subtitle", value: string) => void;
	onPick: (index: number) => void;
	onClear: (index: number) => void;
}

// Sizes use container query units so the poster scales as one piece
// (and exports identically at any width).
export function Poster({ poster, onTitleChange, onPick, onClear }: PosterProps) {
	return (
		<div className="@container w-full">
			<div className="poster-bg flex flex-col items-center gap-[3cqw] px-[3cqw] py-[2.5cqw]">
				<header className="w-[47cqw] rounded-[2.5cqw] border border-black/10 bg-cream px-[3cqw] py-[1.4cqw] text-center shadow-sm">
					<input
						aria-label="Poster title"
						value={poster.title}
						onChange={(e) => onTitleChange("title", e.target.value)}
						className="w-full bg-transparent text-center text-[4.4cqw] leading-tight font-extrabold text-ink outline-none"
					/>
					<input
						aria-label="Poster subtitle"
						value={poster.subtitle}
						onChange={(e) => onTitleChange("subtitle", e.target.value)}
						className="w-full bg-transparent text-center text-[1.7cqw] font-semibold text-ink/70 outline-none"
					/>
				</header>

				<div className="grid w-full grid-cols-3 gap-[1.6cqw]">
					{poster.slots.map((game, i) => (
						<Tile
							key={i}
							game={game}
							onPick={() => onPick(i)}
							onClear={() => onClear(i)}
						/>
					))}
				</div>

				<footer className="rounded-[2cqw] bg-cream/80 px-[4cqw] py-[0.6cqw] text-[1.5cqw] font-bold text-ink">
					#My9Games
				</footer>
			</div>
		</div>
	);
}

function Tile({
	game,
	onPick,
	onClear,
}: {
	game: Game | null;
	onPick: () => void;
	onClear: () => void;
}) {
	if (!game) {
		return (
			<button
				type="button"
				onClick={onPick}
				className="flex aspect-[5/7] cursor-pointer flex-col items-center justify-center gap-[1cqw] rounded-[1.8cqw] border-[0.35cqw] border-dashed border-ink/25 bg-white/40 text-ink/50 transition hover:border-ink/50 hover:bg-white/60 hover:text-ink/80"
			>
				<span className="text-[6cqw] leading-none font-light">+</span>
				<span className="text-[1.8cqw] font-semibold">Add a game</span>
			</button>
		);
	}

	return (
		<div className="group relative aspect-[5/7] overflow-hidden rounded-[1.8cqw] bg-ink shadow-[0_0.6cqw_1.2cqw_rgba(0,0,0,0.25)] ring-[0.4cqw] ring-ink">
			<button
				type="button"
				onClick={onPick}
				aria-label={`Change ${game.name}`}
				className="block size-full cursor-pointer"
			>
				<img
					src={coverUrl(game.imageId)}
					alt=""
					className="size-full object-cover"
					draggable={false}
				/>
			</button>
			<div className="pointer-events-none absolute inset-x-[1cqw] bottom-[1cqw] rounded-[0.5cqw] bg-cream/95 px-[1.2cqw] py-[1cqw] text-left text-[1.45cqw] leading-tight font-semibold text-ink">
				{game.name}
			</div>
			<button
				type="button"
				onClick={onClear}
				aria-label={`Remove ${game.name}`}
				className="absolute top-[1cqw] right-[1cqw] flex size-[4cqw] cursor-pointer items-center justify-center rounded-full bg-black/60 text-[2.4cqw] text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100"
			>
				×
			</button>
		</div>
	);
}
