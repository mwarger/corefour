// The app's server entry, resolved by the `#app/entry.server` alias in
// vite.config.ts. It's typed here through the shared contract because the
// app's own sources need DOM types that this Worker project doesn't load.
declare module '#app/entry.server' {
  type AppServer = import('../shared/ssr.ts').AppServer
  export const renderSharedPage: AppServer['renderSharedPage']
  export const buildId: AppServer['buildId']
  export const isDevelopment: AppServer['isDevelopment']
}
