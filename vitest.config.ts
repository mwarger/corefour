import { defineConfig } from "vitest/config";

// Unit tests cover pure modules only, so skip vite.config.ts (and its
// Cloudflare plugin) and run in plain Node.
export default defineConfig({
	test: { include: ["test/**/*.test.ts"] },
});
