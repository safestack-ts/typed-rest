import { z } from 'zod'
import { ExtractPathParams } from './extract-path-params'
import { AnyRouteValidator } from './any-route-validator'

export type PathParamsMatchingRouteValidator<TPath extends string> =
  {} extends ExtractPathParams<TPath>
    ? AnyRouteValidator
    : z.ZodObject<{
        params: z.ZodObject<
          MappedKeysToZodType<ExtractPathParams<TPath>> &
            Record<string, z.ZodTypeAny>
        >
        query?: z.ZodObject<any> | z.ZodOptional<z.ZodObject<any>>
        body?: z.AnyZodObject
        headers?: z.ZodObject<any> | z.ZodOptional<z.ZodObject<any>>
      }>

type MappedKeysToZodType<T> = {
  [K in keyof T]: z.ZodType<T[K]>
}
