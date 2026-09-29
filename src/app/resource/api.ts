import { Data, Duration, Effect, Schema } from 'effect'
import {
  HttpClient,
  HttpClientRequest,
  type HttpClientResponse,
} from 'effect/unstable/http'
import { Http } from 'foldkit'

import type { CategoryId } from '../../shared/catalog'
import {
  ErrorResponse,
  Grid,
  SearchResults,
  type ShareRequest,
  ShareRequestJson,
  ShareResponse,
} from '../../shared/schema'

const HTTP_NOT_FOUND = 404
const HTTP_SUCCESS_MIN = 200
const HTTP_SUCCESS_MAX = 299
const REQUEST_TIMEOUT = Duration.seconds(20)

const SEARCH_FAILED = 'Search failed. Try again in a moment.'
const LOAD_FAILED = "Couldn't load this poster."
const SHARE_FAILED = 'Sharing failed. Please try again.'

/** A request to the Worker API that failed, with a message fit to show users. */
export class ApiError extends Data.TaggedError('ApiError')<{
  readonly message: string
}> {}

/** The requested shared poster does not exist. */
export class GridNotFoundError extends Data.TaggedError('GridNotFoundError') {}

type Response = HttpClientResponse.HttpClientResponse

const isOk = (response: Response): boolean =>
  response.status >= HTTP_SUCCESS_MIN && response.status <= HTTP_SUCCESS_MAX

const send = (request: HttpClientRequest.HttpClientRequest, failure: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    return yield* client.execute(request)
  }).pipe(
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.mapError(() => new ApiError({ message: failure })),
    Effect.provide(Http.layer),
  )

const decodeBody = <S extends Schema.Top>(
  schema: S,
  response: Response,
  failure: string,
) =>
  response.json.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.toCodecJson(schema))),
    Effect.mapError(() => new ApiError({ message: failure })),
  )

const errorMessage = (response: Response, fallback: string) =>
  response.json.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(ErrorResponse)),
    Effect.map(({ error }) => error),
    Effect.orElseSucceed(() => fallback),
  )

export const searchItems = (category: CategoryId, query: string) =>
  Effect.gen(function* () {
    const response = yield* send(
      HttpClientRequest.get('/api/search').pipe(
        HttpClientRequest.setUrlParams({ category, q: query }),
      ),
      SEARCH_FAILED,
    )
    if (!isOk(response)) {
      return yield* new ApiError({ message: SEARCH_FAILED })
    }
    return yield* decodeBody(SearchResults, response, SEARCH_FAILED)
  })

export const fetchGrid = (id: string) =>
  Effect.gen(function* () {
    const response = yield* send(
      HttpClientRequest.get(`/api/grids/${encodeURIComponent(id)}`),
      LOAD_FAILED,
    )
    if (response.status === HTTP_NOT_FOUND) {
      return yield* new GridNotFoundError()
    }
    if (!isOk(response)) {
      return yield* new ApiError({ message: LOAD_FAILED })
    }
    return yield* decodeBody(Grid, response, LOAD_FAILED)
  })

/** Shares a poster and resolves to its content-addressed ID. */
export const shareGrid = (request: ShareRequest) =>
  Effect.gen(function* () {
    const httpRequest = yield* Schema.encodeEffect(ShareRequestJson)(
      request,
    ).pipe(
      Effect.flatMap(body =>
        HttpClientRequest.post('/api/grids').pipe(
          HttpClientRequest.bodyJson(body),
        ),
      ),
      Effect.mapError(() => new ApiError({ message: SHARE_FAILED })),
    )
    const response = yield* send(httpRequest, SHARE_FAILED)
    if (!isOk(response)) {
      return yield* new ApiError({
        message: yield* errorMessage(response, SHARE_FAILED),
      })
    }
    const { id } = yield* decodeBody(ShareResponse, response, SHARE_FAILED)
    return id
  })
