import { Schema } from 'effect'
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from 'effect/unstable/httpapi'

import { CategoryId, SourceId } from './catalog.ts'
import { Grid, SearchResults, ShareRequest } from './schema.ts'

/**
 * The Worker's HTTP API, declared once. The Worker implements it with
 * `HttpApiBuilder` and the client derives its typed client from it with
 * `HttpApiClient`, so the two cannot disagree about paths, payloads, or errors.
 */

/** Shared posters are content-addressed: 10 base62 characters. */
export const GridId = Schema.String.check(Schema.isPattern(/^[0-9A-Za-z]{10}$/))

export const ImageSize = Schema.Literals(['thumb', 'cover', 'og'])
export type ImageSize = typeof ImageSize.Type

export const ShareResponse = Schema.Struct({ id: GridId })

// ERRORS

export class GridNotFound extends Schema.TaggedError<GridNotFound>()(
  'GridNotFound',
  {},
  { httpApiStatus: 404 },
) {}

export class ImageNotFound extends Schema.TaggedError<ImageNotFound>()(
  'ImageNotFound',
  {},
  { httpApiStatus: 404 },
) {}

/** An item on the poster doesn't exist in its source database. */
export class UnknownItem extends Schema.TaggedError<UnknownItem>()(
  'UnknownItem',
  {},
  { httpApiStatus: 400 },
) {}

export class TooManyShares extends Schema.TaggedError<TooManyShares>()(
  'TooManyShares',
  {},
  { httpApiStatus: 429 },
) {}

/** Turnstile didn't confirm the visitor is human. */
export class NotVerified extends Schema.TaggedError<NotVerified>()(
  'NotVerified',
  {},
  { httpApiStatus: 403 },
) {}

/** Storage is out of write quota for the day. */
export class ShareBusy extends Schema.TaggedError<ShareBusy>()(
  'ShareBusy',
  {},
  { httpApiStatus: 503 },
) {}

// GROUPS

export class SearchGroup extends HttpApiGroup.make('search').add(
  HttpApiEndpoint.get('search', '/search', {
    query: { category: CategoryId, q: Schema.String },
    success: SearchResults,
  }),
) {}

export class GridsGroup extends HttpApiGroup.make('grids')
  .add(
    HttpApiEndpoint.post('share', '/grids', {
      payload: ShareRequest,
      success: HttpApiSchema.status(201)(ShareResponse),
      error: [UnknownItem, TooManyShares, NotVerified, ShareBusy],
    }),
  )
  .add(
    HttpApiEndpoint.get('get', '/grids/:id', {
      params: { id: GridId },
      success: Grid,
      error: GridNotFound,
    }),
  ) {}

/** Binary responses: the client never calls these, the browser loads them as images. */
export class ImagesGroup extends HttpApiGroup.make('images')
  .add(
    HttpApiEndpoint.get('cover', '/img/:source/:size/:key', {
      params: { source: SourceId, size: ImageSize, key: Schema.String },
      success: HttpApiSchema.StreamUint8Array({ contentType: 'image/jpeg' }),
      error: ImageNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.get('preview', '/og/:file', {
      params: { file: Schema.String },
      success: HttpApiSchema.StreamUint8Array({ contentType: 'image/png' }),
      error: GridNotFound,
    }),
  ) {}

export class HealthGroup extends HttpApiGroup.make('health').add(
  HttpApiEndpoint.get('check', '/health', {
    success: Schema.Struct({ ok: Schema.Boolean }),
  }),
) {}

export class CoreFourApi extends HttpApi.make('CoreFour')
  .add(SearchGroup)
  .add(GridsGroup)
  .add(ImagesGroup)
  .add(HealthGroup)
  .prefix('/api')
  .annotate(OpenApi.Title, 'Core Four API') {}
