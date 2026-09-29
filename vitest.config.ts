import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        // Worker and shared-schema unit tests: pure functions in Node.
        test: { name: 'worker', include: ['test/**/*.test.ts'] },
      },
      {
        test: {
          name: 'app',
          include: ['src/app/**/*.test.ts'],
          environment: 'happy-dom',
          setupFiles: ['./src/app/vitest-setup.ts'],
          server: {
            deps: { inline: ['foldkit', '@foldkit/ui', '@foldkit/devtools'] },
          },
        },
      },
    ],
  },
})
