import {
	DndContext,
	type DragEndEvent,
	MouseSensor,
	TouchSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { type Ref, useState } from "react";
import { type Game, LIMITS } from "../shared/types.ts";
import { coverUrl } from "./covers.ts";
import type { PosterState } from "./usePoster.ts";

interface EditHandlers {
	onTitleChange: (field: "title" | "subtitle", value: string) => void;
	onPick: (index: number) => void;
	onClear: (index: number) => void;
	onSwap: (from: number, to: number) => void;
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

				{edit ? (
					<EditableGrid slots={poster.slots} edit={edit} />
				) : (
					<div className="grid w-full grid-cols-3 gap-[1.6cqw]">
						{poster.slots.map((game, i) =>
							game ? (
								<FilledTile key={i} game={game} />
							) : (
								<div key={i} className="aspect-[5/7] rounded-[1.8cqw] bg-white/40" />
							),
						)}
					</div>
				)}

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

/**
 * Drag a game onto another slot to swap them. The tile itself follows the
 * pointer (rather than a DragOverlay) because the poster's `@container` makes
 * it the containing block for fixed-position descendants, which would offset
 * an overlay.
 *
 * Mouse drags start after a few pixels so clicks still open the picker;
 * touch drags need a long press so the page still scrolls normally.
 */
function EditableGrid({ slots, edit }: { slots: (Game | null)[]; edit: EditHandlers }) {
	const [dragging, setDragging] = useState<number | null>(null);
	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
	);

	const onDragEnd = ({ active, over }: DragEndEvent) => {
		setDragging(null);
		if (over && over.id !== active.id) edit.onSwap(Number(active.id), Number(over.id));
	};

	return (
		<DndContext
			sensors={sensors}
			onDragStart={({ active }) => setDragging(Number(active.id))}
			onDragEnd={onDragEnd}
			onDragCancel={() => setDragging(null)}
		>
			<div className="grid w-full grid-cols-3 gap-[1.6cqw]">
				{slots.map((game, i) => (
					<Slot
						key={i}
						index={i}
						game={game}
						isDragging={dragging === i}
						onPick={() => edit.onPick(i)}
						onClear={() => edit.onClear(i)}
					/>
				))}
			</div>
		</DndContext>
	);
}

function Slot({
	index,
	game,
	isDragging,
	onPick,
	onClear,
}: {
	index: number;
	game: Game | null;
	isDragging: boolean;
	onPick: () => void;
	onClear: () => void;
}) {
	const id = String(index);
	const drop = useDroppable({ id });
	const drag = useDraggable({ id, disabled: !game });
	const setRef = (el: HTMLElement | null) => {
		drop.setNodeRef(el);
		drag.setNodeRef(el);
	};
	const highlight = drop.isOver && !isDragging ? "ring-[0.6cqw] ring-amber-400 ring-offset-2" : "";
	const t = drag.transform;

	if (!game) {
		return (
			<button
				ref={setRef}
				type="button"
				onClick={onPick}
				className={`flex aspect-[5/7] cursor-pointer flex-col items-center justify-center gap-[1cqw] rounded-[1.8cqw] border-[0.35cqw] border-dashed border-ink/25 bg-white/40 text-ink/50 transition hover:border-ink/50 hover:bg-white/60 hover:text-ink/80 ${highlight}`}
			>
				<span className="text-[6cqw] leading-none font-light">+</span>
				<span className="text-[1.8cqw] font-semibold">Add a game</span>
			</button>
		);
	}

	return (
		<div
			ref={setRef}
			{...drag.attributes}
			{...drag.listeners}
			// dnd-kit sets role="button"; the inner button is the real control.
			role={undefined}
			tabIndex={-1}
			style={
				t ? { transform: `translate3d(${t.x}px, ${t.y}px, 0) rotate(2deg) scale(1.05)` } : undefined
			}
			className={`group relative touch-manipulation rounded-[1.8cqw] select-none [-webkit-touch-callout:none] ${
				isDragging ? "z-10 cursor-grabbing shadow-2xl" : "cursor-grab"
			} ${highlight}`}
		>
			<FilledTile game={game} onPick={onPick} />
			<button
				type="button"
				data-export-ignore
				onClick={onClear}
				aria-label={`Remove ${game.name}`}
				className="absolute top-[1cqw] right-[1cqw] flex size-[4cqw] cursor-pointer items-center justify-center rounded-full bg-black/60 text-[2.4cqw] text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100"
			>
				×
			</button>
		</div>
	);
}

function FilledTile({ game, onPick }: { game: Game; onPick?: () => void }) {
	const cover = (
		<img
			src={coverUrl(game.imageId)}
			alt={game.name}
			className="size-full object-cover"
			draggable={false}
		/>
	);
	return (
		<div className="relative aspect-[5/7] overflow-hidden rounded-[1.8cqw] bg-ink shadow-[0_0.6cqw_1.2cqw_rgba(0,0,0,0.25)] ring-[0.4cqw] ring-ink">
			{onPick ? (
				<button
					type="button"
					onClick={onPick}
					aria-label={`Change ${game.name}`}
					className="block size-full cursor-[inherit]"
				>
					{cover}
				</button>
			) : (
				cover
			)}
			<div className="pointer-events-none absolute inset-x-[1cqw] bottom-[1cqw] rounded-[0.5cqw] bg-cream/95 px-[1.2cqw] py-[1cqw] text-left text-[1.45cqw] leading-tight font-semibold text-ink">
				{game.name}
			</div>
		</div>
	);
}
