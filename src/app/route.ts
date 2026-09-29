import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Editor: {},
  Shared: { id: Schema.String },
  NotFound: { path: Schema.String },
})
export type AppRoute = typeof AppRoute.Type

export const editorRouter = pipe(Route.root, Route.mapTo(AppRoute.Editor))

export const sharedRouter = pipe(
  literal('g'),
  slash(string('id')),
  Route.mapTo(AppRoute.Shared),
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  Route.oneOf(sharedRouter, editorRouter),
  AppRoute.NotFound,
)
