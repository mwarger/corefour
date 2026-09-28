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
import { CATEGORIES, subtitleText } from "../shared/catalog.ts";
import type { Grid, Item } from "../shared/types.ts";
import { coverUrl } from "./covers.ts";

interface EditHandlers {
	onSubtitleChange: (subtitleId: string) => void;
	onPick: (index: number) => void;
	onClear: (index: number) => void;
	onSwap: (from: number, to: number) => void;
}

interface PosterProps {
	poster: Grid;
	/** Omit for a read-only poster (shared links). */
	edit?: EditHandlers;
	ref?: Ref<HTMLDivElement>;
}

// Sizes use container query units so the poster scales as one piece
// (and exports identically at any width).
export function Poster({ poster, edit, ref }: PosterProps) {
	const category = CATEGORIES[poster.category];
	return (
		<div className="@container w-full">
			<div ref={ref} className="poster-bg flex flex-col items-center gap-[3cqw] px-[3cqw] py-[2.5cqw]">
				<header className="w-[47cqw] rounded-[2.5cqw] border border-black/10 bg-cream px-[3cqw] py-[1.4cqw] text-center shadow-sm">
					<h1 className="text-[4.4cqw] leading-tight font-extrabold text-ink">
						{category.title}
					</h1>
					{edit ? (
						<SubtitlePicker poster={poster} onChange={edit.onSubtitleChange} />
					) : (
						<p className="truncate text-[1.7cqw] font-semibold text-ink/70">
							{subtitleText(poster.category, poster.subtitle)}
						</p>
					)}
				</header>

				{edit ? (
					<EditableGrid items={poster.items} noun={category.noun} edit={edit} />
				) : (
					<div className="grid w-full grid-cols-3 gap-[1.6cqw]">
						{poster.items.map((item, i) =>
							item ? (
								<FilledTile key={i} item={item} />
							) : (
								<div key={i} className="aspect-[5/7] rounded-[1.8cqw] bg-white/40" />
							),
						)}
					</div>
				)}

				<footer className="rounded-[2cqw] bg-cream/80 px-[4cqw] py-[0.6cqw] text-[1.5cqw] font-bold text-ink">
					{category.hashtag}
				</footer>
			</div>
		</div>
	);
}

/**
 * Subtitles are presets rather than free text. The visible label is plain
 * text; a transparent native select sits on top to handle input. PNG export
 * skips the select (it doesn't clone a select's current value reliably) and
 * the caret.
 */
function SubtitlePicker({ poster, onChange }: { poster: Grid; onChange: (id: string) => void }) {
	return (
		<div className="relative mx-auto flex w-fit max-w-full items-center gap-[0.6cqw] text-[1.7cqw] font-semibold text-ink/70 hover:text-ink">
			<span className="truncate">{subtitleText(poster.category, poster.subtitle)}</span>
			<span data-export-ignore aria-hidden className="text-[1.4cqw] opacity-60">
				▾
			</span>
			<select
				data-export-ignore
				aria-label="Poster subtitle"
				value={poster.subtitle}
				onChange={(e) => onChange(e.target.value)}
				className="absolute inset-0 cursor-pointer opacity-0"
			>
				{CATEGORIES[poster.category].subtitles.map((s) => (
					<option key={s.id} value={s.id}>
						{s.text}
					</option>
				))}
			</select>
		</div>
	);
}

/**
 * Drag an item onto another slot to swap them. The tile itself follows the
 * pointer (rather than a DragOverlay) because the poster's `@container` makes
 * it the containing block for fixed-position descendants, which would offset
 * an overlay.
 *
 * Mouse drags start after a few pixels so clicks still open the picker;
 * touch drags need a long press so the page still scrolls normally.
 */
function EditableGrid({
	items,
	noun,
	edit,
}: {
	items: (Item | null)[];
	noun: string;
	edit: EditHandlers;
}) {
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
				{items.map((item, i) => (
					<Slot
						key={i}
						index={i}
						item={item}
						noun={noun}
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
	item,
	noun,
	isDragging,
	onPick,
	onClear,
}: {
	index: number;
	item: Item | null;
	noun: string;
	isDragging: boolean;
	onPick: () => void;
	onClear: () => void;
}) {
	const id = String(index);
	const drop = useDroppable({ id });
	const drag = useDraggable({ id, disabled: !item });
	const setRef = (el: HTMLElement | null) => {
		drop.setNodeRef(el);
		drag.setNodeRef(el);
	};
	const highlight = drop.isOver && !isDragging ? "ring-[0.6cqw] ring-amber-400 ring-offset-2" : "";
	const t = drag.transform;

	if (!item) {
		return (
			<button
				ref={setRef}
				type="button"
				onClick={onPick}
				className={`flex aspect-[5/7] cursor-pointer flex-col items-center justify-center gap-[1cqw] rounded-[1.8cqw] border-[0.35cqw] border-dashed border-ink/25 bg-white/40 text-ink/50 transition hover:border-ink/50 hover:bg-white/60 hover:text-ink/80 ${highlight}`}
			>
				<span className="text-[6cqw] leading-none font-light">+</span>
				<span className="text-[1.8cqw] font-semibold">Add a {noun}</span>
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
			<FilledTile item={item} onPick={onPick} />
			<button
				type="button"
				data-export-ignore
				onClick={onClear}
				aria-label={`Remove ${item.name}`}
				className="absolute top-[1cqw] right-[1cqw] flex size-[4cqw] cursor-pointer items-center justify-center rounded-full bg-black/60 text-[2.4cqw] text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100"
			>
				×
			</button>
		</div>
	);
}

function FilledTile({ item, onPick }: { item: Item; onPick?: () => void }) {
	const cover = (
		<img
			src={coverUrl(item)}
			alt={item.name}
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
					aria-label={`Change ${item.name}`}
					className="block size-full cursor-[inherit]"
				>
					{cover}
				</button>
			) : (
				cover
			)}
			<div className="pointer-events-none absolute inset-x-[1cqw] bottom-[1cqw] rounded-[0.5cqw] bg-cream/95 px-[1.2cqw] py-[1cqw] text-left text-[1.45cqw] leading-tight font-semibold text-ink">
				{item.name}
			</div>
		</div>
	);
}
