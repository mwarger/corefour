import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Alchemy's Website.Vite adds its own Cloudflare plugin at build/dev time.
export default defineConfig({
	plugins: [react(), tailwindcss()],
});
