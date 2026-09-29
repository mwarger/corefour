import { Effect, Option } from 'effect'
import { Server } from 'foldkit/experimental'

import type { RenderSharedPage } from '../shared/ssr'
import { Flags, init, routing } from './main'
import { view } from './view'

/**
 * Server-renders a shared poster's page. The Worker loads the poster and
 * passes it in, so it arrives as Flags and `init` starts with it loaded. The
 * Flags are embedded in the page, and the browser hydrates from them.
 */
export const renderSharedPage: RenderSharedPage = ({ template, url, poster }) =>
  Server.renderToString(
    { Flags, init, view, routing },
    {
      url,
      flags: Flags.make({
        maybeDraft: Option.none(),
        maybeSharedPoster: Option.some(poster),
      }),
      buildId: import.meta.env.FOLDKIT_BUILD_ID,
    },
  ).pipe(
    Effect.flatMap(rendered =>
      Effect.try(() => Server.injectIntoTemplate(template, rendered)),
    ),
  )
