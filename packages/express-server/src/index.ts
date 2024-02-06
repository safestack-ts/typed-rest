import * as Express from "express";
import {
  AnyRouteDef,
  BagOfRoutes,
  HTTPMethod,
  JoinPath,
  ResponseTypeKey,
  RouteDef,
  RouteHashMap,
  StringReplaceHead,
  StringStartsWith,
  Versioning,
  WithoutTrailingSlash,
  demoBagOfRoutes,
  joinPath,
  typedLowerCase,
} from "@typed-rest/core";
import cors from "cors";
import * as z from "zod";
import { StatusCodes } from "http-status-codes";

type ExpressRequest = Express.Request;
type ExpressResponse = Express.Response;
type ExpressRouter = Express.Router;
type ExpressRequestHandler = Express.RequestHandler;
type ExpressApp = Express.Application;

export type TypedRequestHandler<TRequest extends ExpressRequest> = (
  request: TRequest,
  response: ExpressResponse,
  next: Express.NextFunction
) => void | Promise<void>;

export type TypedMiddleware<
  TRequestIn extends ExpressRequest,
  TRequestOut extends TRequestIn
> = TypedRequestHandler<TRequestIn>;

export const defineMiddleware =
  <TRequestIn extends ExpressRequest, TRequestOut extends TRequestIn>(
    middlewareFn: TypedRequestHandler<TRequestIn>
  ): TypedMiddleware<TRequestIn, TRequestOut> =>
  (
    request: TRequestIn,
    response: ExpressResponse,
    next: Express.NextFunction
  ) => {
    middlewareFn(request, response, next);
  };

type FormatRootPath<TPath extends string> = TPath extends "" ? "/" : TPath;

type PossiblePaths<
  TRoutes extends AnyRouteDef,
  TMethod extends HTTPMethod
> = Extract<TRoutes, { method: TMethod }>["path"] extends never
  ? "No path found for this method"
  : Extract<TRoutes, { method: TMethod }>["path"];

type InferredPossiblePathsFromPrefix<
  TRoutes extends AnyRouteDef,
  TMethod extends HTTPMethod,
  TRoutePrefix extends string
> = FormatRootPath<
  StringReplaceHead<
    StringStartsWith<PossiblePaths<TRoutes, TMethod>, TRoutePrefix>,
    TRoutePrefix extends "/" ? "" : TRoutePrefix,
    ""
  >
>;

export class TypedRouter<
  TRoutes extends AnyRouteDef,
  TRequest extends ExpressRequest,
  TPath extends string
> {
  public readonly routes: RouteHashMap;
  protected readonly router: ExpressRouter;
  protected readonly path: TPath;

  constructor(routes: RouteHashMap, router: ExpressRouter, path: TPath) {
    this.routes = routes;
    this.router = router;
    this.path = path;
  }

  public use<TRequestIn extends TRequest, TRequestOut extends TRequestIn>(
    handler: TypedMiddleware<TRequestIn, TRequestOut>
  ): TypedRouter<TRoutes, TRequestOut, TPath> {
    this.router.use(handler as ExpressRequestHandler);

    return this as any as TypedRouter<TRoutes, TRequestOut, TPath>;
  }

  public branch<TPathBranch extends string>(
    path: TPathBranch
  ): TypedRouter<TRoutes, TRequest, JoinPath<TPath, TPathBranch>> {
    const newRouter = new TypedRouter(
      this.routes,
      Express.Router(),
      joinPath(this.path, path)
    ) as TypedRouter<TRoutes, TRequest, JoinPath<TPath, TPathBranch>>;

    this.router.use(path, newRouter.router);

    return newRouter;
  }

  private getRouteHandler<
    TMethod extends HTTPMethod,
    TPathSuffix extends string
  >(method: TMethod, path: TPathSuffix) {
    type TRoute = Extract<
      TRoutes,
      {
        method: TMethod;
        path: WithoutTrailingSlash<JoinPath<TPath, TPathSuffix>>;
      }
    >;
    const route = this.routes.get([method, joinPath(this.path, path)]);

    if (!route) {
      throw new Error(`Route not found for path: ${joinPath(this.path, path)}`);
    }

    return new TypedRouteHandler<TRoute, TPathSuffix, TRequest>(
      route as TRoute,
      path,
      this.router
    );
  }

  public get<
    TPathSuffix extends InferredPossiblePathsFromPrefix<TRoutes, "GET", TPath>
  >(path: TPathSuffix) {
    return this.getRouteHandler("GET", path);
  }

  public post<
    TPathSuffix extends InferredPossiblePathsFromPrefix<TRoutes, "POST", TPath>
  >(path: TPathSuffix) {
    return this.getRouteHandler("POST", path);
  }

  public put<
    TPathSuffix extends InferredPossiblePathsFromPrefix<TRoutes, "PUT", TPath>
  >(path: TPathSuffix) {
    return this.getRouteHandler("PUT", path);
  }

  public patch<
    TPathSuffix extends InferredPossiblePathsFromPrefix<TRoutes, "PATCH", TPath>
  >(path: TPathSuffix) {
    return this.getRouteHandler("PATCH", path);
  }

  public delete<
    TPathSuffix extends InferredPossiblePathsFromPrefix<
      TRoutes,
      "DELETE",
      TPath
    >
  >(path: TPathSuffix) {
    return this.getRouteHandler("DELETE", path);
  }
}

type RequestReturnType<TData> =
  | {
      data: TData;
      statusCode?: number;
    }
  | {
      data?: TData;
      customize: (
        response: Express.Response,
        data?: TData
      ) => void | Promise<void>;
      statusCode?: number;
    };

type HandlerReturnType<TRoute extends AnyRouteDef> = RequestReturnType<
  TRoute[ResponseTypeKey]
>;

type RouteValidationOutput<TRoute extends AnyRouteDef> =
  TRoute extends RouteDef<any, any, any, infer TValidator, any>
    ? z.output<TValidator>
    : never;

type TypedRouteHandlerFn<
  TRoute extends AnyRouteDef,
  TRequest extends ExpressRequest,
  TValidationResult
> = (
  request: TRequest,
  validationOutput: TValidationResult
) => HandlerReturnType<TRoute> | Promise<HandlerReturnType<TRoute>>;

class TypedRouteHandler<
  TRoute extends AnyRouteDef,
  TPathSuffix extends string,
  TRequest extends ExpressRequest
> {
  protected readonly route: TRoute;
  protected readonly path: TPathSuffix;
  protected readonly router: ExpressRouter;
  protected readonly middlewares: TypedMiddleware<any, any>[] = [];

  constructor(route: TRoute, path: TPathSuffix, router: ExpressRouter) {
    this.route = route;
    this.path = path;
    this.router = router;
  }

  public middleware<
    TRequestIn extends TRequest,
    TRequestOut extends TRequestIn
  >(
    handler: TypedMiddleware<TRequestIn, TRequestOut>
  ): TypedRouteHandler<TRoute, TPathSuffix, TRequestOut> {
    this.middlewares.push(handler);

    return this as any as TypedRouteHandler<TRoute, TPathSuffix, TRequestOut>;
  }

  public handle(
    handler: TypedRouteHandlerFn<
      TRoute,
      TRequest,
      RouteValidationOutput<TRoute>
    >
  ) {
    this.router[typedLowerCase(this.route.method)](
      this.path,
      ...this.middlewares,
      async (request, response) => {
        const validationOutput = this.route.validator.parse(request);

        const result = await handler(
          request as any as TRequest,
          validationOutput
        );

        response.status(result.statusCode || StatusCodes.OK);

        // make sure this is the last action in the handler,
        // since from here on we alredy sent the response and the request is finished
        if ("customize" in result) {
          await result.customize(response, result.data);
        } else {
          response.send(result.data);
        }
      }
    );
  }
}

export class TypedExpressApplication<
  TRoutes extends AnyRouteDef,
  TRequest extends ExpressRequest
> extends TypedRouter<TRoutes, TRequest, "/"> {
  private readonly bagOfRoutes: BagOfRoutes<TRoutes, Versioning>;

  constructor(
    expressApp: ExpressApp,
    bagOfRoutes: BagOfRoutes<TRoutes, Versioning>
  ) {
    super(bagOfRoutes.routes, expressApp, "/");

    this.bagOfRoutes = bagOfRoutes;
  }
}

// demo

type RequestWithUserId = ExpressRequest & { userId: string };
const authMiddleware = defineMiddleware<ExpressRequest, RequestWithUserId>(
  (request, response, next) => {
    (request as any).userId = "123";
    next();
  }
);

const expressApp = Express.default();
const typedRESTApplication = new TypedExpressApplication(
  expressApp,
  demoBagOfRoutes
)
  .use(
    cors({
      origin: "*",
      preflightContinue: true,
    })
  )
  .use(authMiddleware)
  .use((request, _, next) => {
    console.log(request.userId);

    next();
  });

const basketRouterPublic = typedRESTApplication.branch("/basket");

basketRouterPublic.use((request, response, next) => {
  // still works
  console.log(request.userId);

  next();
});

basketRouterPublic
  .get("/:basketId/entries")
  .middleware((request, _, next) => {
    console.log(request.userId);

    next();
  })
  .handle((request, validationResult) => {
    console.log(request.userId);
    console.log(validationResult.params.basketId);

    return null as any; // @todo
  });

basketRouterPublic
  .get("/")
  .middleware((request, _, next) => {
    console.log(request.userId);
    console.log(request.params.basketId);

    next();
  })
  .handle(async (request, validationResult) => {
    console.log(request.userId);
    console.log(validationResult.params.basketId);

    return {
      statusCode: 201,
      data: { id: "123", entries: [] as any[] },
    };
  });
