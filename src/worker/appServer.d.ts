// The app's server entry, resolved by the `#app/entry.server` alias in
// vite.config.ts. It's typed here through the shared contract because the
// app's own sources need DOM types that this Worker project doesn't load.
declare module '#app/entry.server' {
  export const renderSharedPage: import('../shared/ssr.ts').RenderSharedPage
}
