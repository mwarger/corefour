import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

// NOTE: shared posters are rendered by the Worker and hydrated in the browser,
// and hydration refuses a page whose build id differs from the client's. Vite
// reads this file once per environment it builds (client, then Worker), so a
// generated id is stored back into the environment for every later read to
// reuse. `||=` because the plugin treats an empty FOLDKIT_BUILD_ID as absent.
process.env['FOLDKIT_BUILD_ID'] ||= randomUUID()
const buildId = process.env['FOLDKIT_BUILD_ID']

// Alchemy's Website resource adds its own Cloudflare plugin at build/dev time.
export default defineConfig({
  plugins: [tailwindcss(), foldkit({ buildId, devToolsMcpPort: 9988 })],
  resolve: {
    alias: {
      // Lets the Worker import the app's server entry; see src/worker/appServer.d.ts.
      '#app/entry.server': resolve(
        import.meta.dirname,
        'src/app/entry.server.ts',
      ),
    },
  },
  optimizeDeps: { entries: ['src/app/entry.ts'] },
})
