import { Context, Effect } from 'effect'

/** The Worker invocation's ExecutionContext, provided per request. */
export class Execution extends Context.Service<Execution, ExecutionContext>()(
  'Execution',
) {}

/** Runs `effect` after the response is sent, as part of the same invocation. */
export const runAfterResponse = <E>(
  effect: Effect.Effect<unknown, E, Execution>,
) =>
  Effect.gen(function* () {
    const execution = yield* Execution
    execution.waitUntil(
      Effect.runPromise(
        effect.pipe(
          Effect.catchCause(cause => Effect.logError(cause)),
          Effect.provideService(Execution, execution),
        ),
      ),
    )
  })
