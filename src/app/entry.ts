import { Runtime } from 'foldkit'

import { Flags, flags, init, routing } from './main'
import { Message } from './message'
import { Model } from './model'
import './styles.css'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

// NOTE: only shared posters are server-rendered (see src/worker/sharePage.ts).
// Their root carries this attribute; every other page boots in the browser.
const SERVER_RENDERED_ROOT = '[data-foldkit-app]'

const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  routing,
  devTools: { Message },
})

if (document.querySelector(SERVER_RENDERED_ROOT) === null) {
  Runtime.run(application, { flags })
} else {
  Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })
}
