import {
  AnyRouteDef,
  BagOfRoutes,
  Versioning,
  VersioningRequired,
} from '@typed-rest/core'
import { RESTClientBase } from './rest-client-base'
import { HTTPAdapter } from '../types/http-adapter'
import { RESTClientWithVersioning } from './rest-client-with-versioning'
import { RESTClientWithoutVersioning } from './rest-client-without-versioning'

export abstract class RESTClient<
  TRoutes extends AnyRouteDef,
  TVersionHistory extends string[]
> extends RESTClientBase<TRoutes, TVersionHistory> {
  public static withoutVersioning<TRoutes extends AnyRouteDef>(
    bagOfRoutes: BagOfRoutes<TRoutes, Versioning.NO_VERSIONING, never>,
    httpAdapter: HTTPAdapter
  ) {
    return new RESTClientWithoutVersioning(bagOfRoutes, httpAdapter)
  }

  public static withVersioning<
    TRoutes extends AnyRouteDef,
    TVersionHistory extends string[],
    TVersion extends TVersionHistory[number]
  >(
    bagOfRoutes: BagOfRoutes<TRoutes, VersioningRequired, TVersionHistory>,
    version: TVersion,
    httpAdapter: HTTPAdapter
  ) {
    return new RESTClientWithVersioning(bagOfRoutes, version, httpAdapter)
  }
}