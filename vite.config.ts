import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

// Alchemy's Website resource adds its own Cloudflare plugin at build/dev time.
export default defineConfig({
  plugins: [tailwindcss(), foldkit({ devToolsMcpPort: 9988 })],
  optimizeDeps: { entries: ['src/app/entry.ts'] },
})
