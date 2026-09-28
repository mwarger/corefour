import { describe, expect, it } from "vitest";
import { emptyGrid, migrateDraft } from "../src/shared/draft.ts";

describe("migrateDraft", () => {
	it("upgrades a v1 draft and discards its free text", () => {
		const v1 = {
			title: "My custom title",
			subtitle: "Something a user typed",
			slots: [
				{ id: 1029, name: "The Legend of Zelda: Ocarina of Time", year: 1998, imageId: "co3nnx" },
				...Array(8).fill(null),
			],
		};
		const grid = migrateDraft(v1);
		expect(grid).toMatchObject({ v: 2, category: "games", subtitle: "shaped", theme: "sage" });
		expect(grid).not.toHaveProperty("title");
		expect(grid.items[0]).toEqual({
			source: "igdb",
			id: "1029",
			name: "The Legend of Zelda: Ocarina of Time",
			year: 1998,
			image: "co3nnx",
		});
		expect(grid.items.slice(1)).toEqual(Array(8).fill(null));
	});

	it("keeps a valid v2 draft", () => {
		const v2 = { ...emptyGrid(), subtitle: "comfort" };
		expect(migrateDraft(v2)).toEqual(v2);
	});

	it("resets unknown presets to defaults", () => {
		const grid = migrateDraft({ ...emptyGrid(), subtitle: "not-a-preset", theme: "neon" });
		expect(grid.subtitle).toBe("shaped");
		expect(grid.theme).toBe("sage");
	});

	it("falls back to an empty grid for garbage", () => {
		expect(migrateDraft("garbage")).toEqual(emptyGrid());
		expect(migrateDraft({ items: "nope" })).toEqual(emptyGrid());
	});
});
