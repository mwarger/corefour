import { describe, expect, it } from "vitest";
import { parseShareRequest } from "../src/worker/validate.ts";

const valid = () => ({
	category: "games",
	subtitle: "shaped",
	theme: "sage",
	items: [{ source: "igdb", id: "1029" }, null, null, null, null, null, null, null, null],
	turnstileToken: "token",
});

describe("parseShareRequest", () => {
	it("accepts a valid request", () => {
		expect(parseShareRequest(valid())).toEqual(valid());
	});

	it("drops free-text fields and item details instead of storing them", () => {
		const req = {
			...valid(),
			title: "anything a user typed",
			items: [
				{ source: "igdb", id: "1029", name: "Fake Name", image: "evil" },
				...valid().items.slice(1),
			],
		};
		const parsed = parseShareRequest(req);
		expect(parsed).not.toHaveProperty("title");
		expect(parsed?.items[0]).toEqual({ source: "igdb", id: "1029" });
	});

	it.each([
		["unknown category", { category: "memes" }],
		["free-text subtitle", { subtitle: "The 9 Games That Shaped Who I Am" }],
		["unknown theme", { theme: "neon" }],
		["missing token", { turnstileToken: undefined }],
		["wrong item count", { items: [{ source: "igdb", id: "1" }] }],
		["all empty", { items: Array(9).fill(null) }],
		["non-numeric IGDB id", { items: [{ source: "igdb", id: "1; drop" }, ...Array(8).fill(null)] }],
		["unknown source", { items: [{ source: "evil", id: "1" }, ...Array(8).fill(null)] }],
	])("rejects %s", (_, patch) => {
		expect(parseShareRequest({ ...valid(), ...patch })).toBeNull();
	});

	it("rejects non-objects", () => {
		expect(parseShareRequest(null)).toBeNull();
		expect(parseShareRequest("nope")).toBeNull();
	});
});
