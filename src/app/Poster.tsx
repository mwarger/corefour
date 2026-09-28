import type { Ref } from "react";
import { type Game, LIMITS } from "../shared/types.ts";
import { coverUrl } from "./covers.ts";
import type { PosterState } from "./usePoster.ts";

interface EditHandlers {
	onTitleChange: (field: "title" | "subtitle", value: string) => void;
	onPick: (index: number) => void;
	onClear: (index: number) => void;
}

interface PosterProps {
	poster: PosterState;
	/** Omit for a read-only poster (shared links). */
	edit?: EditHandlers;
	ref?: Ref<HTMLDivElement>;
}

// Sizes use container query units so the poster scales as one piece
// (and exports identically at any width).
export function Poster({ poster, edit, ref }: PosterProps) {
	return (
		<div className="@container w-full">
			<div ref={ref} className="poster-bg flex flex-col items-center gap-[3cqw] px-[3cqw] py-[2.5cqw]">
				<header className="w-[47cqw] rounded-[2.5cqw] border border-black/10 bg-cream px-[3cqw] py-[1.4cqw] text-center shadow-sm">
					<TitleText
						label="Poster title"
						value={poster.title}
						maxLength={LIMITS.title}
						onChange={edit && ((v) => edit.onTitleChange("title", v))}
						className="text-[4.4cqw] leading-tight font-extrabold text-ink"
					/>
					<TitleText
						label="Poster subtitle"
						value={poster.subtitle}
						maxLength={LIMITS.subtitle}
						onChange={edit && ((v) => edit.onTitleChange("subtitle", v))}
						className="text-[1.7cqw] font-semibold text-ink/70"
					/>
				</header>

				<div className="grid w-full grid-cols-3 gap-[1.6cqw]">
					{poster.slots.map((game, i) => (
						<Tile
							key={i}
							game={game}
							onPick={edit && (() => edit.onPick(i))}
							onClear={edit && (() => edit.onClear(i))}
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

function TitleText({
	label,
	value,
	maxLength,
	onChange,
	className,
}: {
	label: string;
	value: string;
	maxLength: number;
	onChange?: (value: string) => void;
	className: string;
}) {
	if (!onChange) return <div className={`truncate ${className}`}>{value}</div>;
	return (
		<input
			aria-label={label}
			value={value}
			maxLength={maxLength}
			onChange={(e) => onChange(e.target.value)}
			className={`w-full bg-transparent text-center outline-none ${className}`}
		/>
	);
}

function Tile({
	game,
	onPick,
	onClear,
}: {
	game: Game | null;
	onPick?: () => void;
	onClear?: () => void;
}) {
	if (!game && !onPick) {
		return <div className="aspect-[5/7] rounded-[1.8cqw] bg-white/40" />;
	}
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
			{onPick ? (
				<button
					type="button"
					onClick={onPick}
					aria-label={`Change ${game.name}`}
					className="block size-full cursor-pointer"
				>
					<Cover game={game} />
				</button>
			) : (
				<Cover game={game} />
			)}
			<div className="pointer-events-none absolute inset-x-[1cqw] bottom-[1cqw] rounded-[0.5cqw] bg-cream/95 px-[1.2cqw] py-[1cqw] text-left text-[1.45cqw] leading-tight font-semibold text-ink">
				{game.name}
			</div>
			{onClear && (
				<button
					type="button"
					data-export-ignore
					onClick={onClear}
					aria-label={`Remove ${game.name}`}
					className="absolute top-[1cqw] right-[1cqw] flex size-[4cqw] cursor-pointer items-center justify-center rounded-full bg-black/60 text-[2.4cqw] text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100"
				>
					×
				</button>
			)}
		</div>
	);
}

function Cover({ game }: { game: Game }) {
	return (
		<img
			src={coverUrl(game.imageId)}
			alt={game.name}
			className="size-full object-cover"
			draggable={false}
		/>
	);
}
