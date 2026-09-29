import { env } from 'cloudflare:workers'
import { Cause, Context, Effect, Layer, Result } from 'effect'
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/unstable/http'

import { ApiLive } from './api.ts'
import { Execution } from './execution.ts'
import { SharePageLive } from './sharePage.ts'

const HTTP_NOT_FOUND = 404

const UnknownApiRouteLive = HttpRouter.add(
  '*',
  '/api/*',
  HttpServerResponse.empty({ status: HTTP_NOT_FOUND }),
)

/** Everything that isn't an API route or a shared poster is the client app. */
const AssetsLive = HttpRouter.add(
  '*',
  '/*',
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const webRequest = yield* HttpServerRequest.toWeb(request)
    return HttpServerResponse.fromWeb(
      yield* Effect.promise(() => env.ASSETS.fetch(webRequest)),
    )
  }),
)

const AppLive = Layer.mergeAll(
  ApiLive,
  SharePageLive,
  UnknownApiRouteLive,
  AssetsLive,
).pipe(Layer.provide(HttpServer.layerServices))

/** Expected failures are already responses; only log what nothing handled. */
const logDefects = HttpMiddleware.make(app =>
  Effect.tapCause(app, cause =>
    Result.match(Cause.findDefect(cause), {
      onSuccess: defect => Effect.logError(defect),
      onFailure: () => Effect.void,
    }),
  ),
)

const { handler } = HttpRouter.toWebHandler(AppLive, {
  disableLogger: true,
  middleware: logDefects,
})

export default {
  fetch: (request, _env, ctx) => handler(request, Context.make(Execution, ctx)),
} satisfies ExportedHandler
