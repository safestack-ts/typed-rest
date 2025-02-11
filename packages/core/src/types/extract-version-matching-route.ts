import { AnyRouteDef } from './any-route-def'

// resolves last version of route according to the version history, given the client version
type SearchRoute<
  TRoutes extends AnyRouteDef,
  TVersionClient extends string,
  TVersionHistory extends string[]
> = Extract<TRoutes, { version: TVersionClient }> extends never
  ? TVersionHistory extends [...infer TOlderVersions, infer TCurrentVersion]
    ? TCurrentVersion extends string
      ? TOlderVersions extends string[]
        ? SearchRoute<TRoutes, TCurrentVersion, TOlderVersions>
        : never // 'TOlderVersions is not a string array'
      : never // 'TCurrentVersion is not a string'
    : never // 'TVersionHistory is not a string array'
  : Extract<TRoutes, { version: TVersionClient }>

// recusively search for the correct version position within the version history to start the route search respecting the given client version
export type ExtractVersionMatchingRoute<
  TRoutes extends AnyRouteDef,
  TClientVersion extends string,
  TVersionHistory extends string[]
> = TVersionHistory extends [...infer TOlderVersions, infer TCurrentVersion]
  ? TCurrentVersion extends TClientVersion
    ? TOlderVersions extends string[]
      ? SearchRoute<TRoutes, TCurrentVersion, TOlderVersions>
      : never //'TOlderVersions is not a string array #3'
    : TOlderVersions extends string[]
    ? ExtractVersionMatchingRoute<TRoutes, TClientVersion, TOlderVersions>
    : never // 'TOlderVersions is not a string array #2'
  : never // 'TVersionHistory is not a string array #1'

export type ExtractLatestMatchingRoutePerPath<
  TRoutes extends AnyRouteDef,
  TClientVersion extends string,
  TVersionHistory extends string[]
> = {
  [Path in TRoutes['path']]: ExtractVersionMatchingRoute<
    Extract<TRoutes, { path: Path }>,
    TClientVersion,
    TVersionHistory
  >
}[TRoutes['path']]
