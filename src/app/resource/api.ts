import { Data, Duration, Effect, Schema } from 'effect'
import { HttpApiClient } from 'effect/unstable/httpapi'
import { Http } from 'foldkit'

import { CoreFourApi, GridId } from '../../shared/api'
import type { CategoryId } from '../../shared/catalog'
import type { ShareRequest } from '../../shared/schema'

const REQUEST_TIMEOUT = Duration.seconds(20)

const SEARCH_FAILED = 'Search failed. Try again in a moment.'
const LOAD_FAILED = "Couldn't load this poster."
const SHARE_FAILED = 'Sharing failed. Please try again.'
const INVALID_POSTER = 'Invalid poster'
const TOO_MANY_SHARES = 'Too many shares. Try again in a minute.'
const NOT_VERIFIED = "Couldn't verify you're human. Please try again."
const SHARE_BUSY = 'Sharing is busy right now. Try again later.'

const isGridId = Schema.is(GridId)

/** A request to the Worker API that failed, with a message fit to show users. */
export class ApiError extends Data.TaggedError('ApiError')<{
  readonly message: string
}> {}

/** The requested shared poster does not exist. */
export class GridNotFoundError extends Data.TaggedError('GridNotFoundError') {}

type AppError = ApiError | GridNotFoundError

const isAppError = (error: unknown): error is AppError =>
  error instanceof ApiError || error instanceof GridNotFoundError

/**
 * Runs `request` against a client derived from the shared API definition.
 * Failures other than `ApiError` and `GridNotFoundError` (network errors,
 * timeouts, unexpected responses) become an `ApiError` with `failure`.
 */
const callApi = <A, E>(
  request: (
    client: HttpApiClient.ForApi<typeof CoreFourApi>,
  ) => Effect.Effect<A, E>,
  failure: string,
) =>
  HttpApiClient.make(CoreFourApi).pipe(
    Effect.flatMap(request),
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.mapError(error =>
      isAppError(error) ? error : new ApiError({ message: failure }),
    ),
    Effect.provide(Http.layer),
  )

const failWith = (message: string) => () =>
  Effect.fail(new ApiError({ message }))

export const searchItems = (category: CategoryId, query: string) =>
  callApi(
    client => client.search.search({ query: { category, q: query } }),
    SEARCH_FAILED,
  )

export const fetchGrid = (id: string) =>
  isGridId(id)
    ? callApi(
        client =>
          client.grids
            .get({ params: { id } })
            .pipe(
              Effect.catchTag('GridNotFound', () =>
                Effect.fail(new GridNotFoundError()),
              ),
            ),
        LOAD_FAILED,
      )
    : Effect.fail(new GridNotFoundError())

/** Shares a poster and resolves to its content-addressed ID. */
export const shareGrid = (request: ShareRequest) =>
  callApi(
    client =>
      client.grids.share({ payload: request }).pipe(
        Effect.map(({ id }) => id),
        Effect.catchTags({
          UnknownItem: failWith(INVALID_POSTER),
          TooManyShares: failWith(TOO_MANY_SHARES),
          NotVerified: failWith(NOT_VERIFIED),
          ShareBusy: failWith(SHARE_BUSY),
        }),
      ),
    SHARE_FAILED,
  )
