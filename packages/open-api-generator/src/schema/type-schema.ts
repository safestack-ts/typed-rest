import { z } from 'zod'

// Intermediate type system representation
export const validateTypeKind = z.enum([
  'string',
  'number',
  'boolean',
  'null',
  'array',
  'object',
  'union',
  'intersection',
  'literal',
  'date',
  'enum',
])
export type TypeKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'array'
  | 'object'
  | 'union'
  | 'intersection'
  | 'literal'
  | 'date'
  | 'enum'

const validateBaseType: z.ZodType<BaseType> = z.object({
  description: z.string().optional(),
  deprecated: z.boolean().optional(),
})
interface BaseType {
  description?: string
  deprecated?: boolean
}

export const validateStringType: z.ZodType<StringType> = validateBaseType.and(
  z.object({
    kind: z.literal('string'),
    format: z.enum(['date-time', 'date', 'email', 'uuid']).optional(),
    pattern: z.string().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
  })
)
export interface StringType extends BaseType {
  kind: 'string'
  format?: 'date-time' | 'date' | 'email' | 'uuid'
  pattern?: string
  minLength?: number
  maxLength?: number
}

export const StringType = (args?: Omit<StringType, 'kind'>): StringType => ({
  kind: 'string',
  ...args,
})

export const validateNumberType: z.ZodType<NumberType> = validateBaseType.and(
  z.object({
    kind: z.literal('number'),
    format: z.enum(['float', 'double', 'int32', 'int64']).optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    multipleOf: z.number().optional(),
  })
)
export interface NumberType extends BaseType {
  kind: 'number'
  format?: 'float' | 'double' | 'int32' | 'int64'
  minimum?: number
  maximum?: number
  multipleOf?: number
}

export const NumberType = (args?: Omit<NumberType, 'kind'>): NumberType => ({
  kind: 'number',
  ...args,
})

export const validateBooleanType: z.ZodType<BooleanType> = validateBaseType.and(
  z.object({
    kind: z.literal('boolean'),
  })
)
export interface BooleanType extends BaseType {
  kind: 'boolean'
}

export const BooleanType = (args?: Omit<BooleanType, 'kind'>): BooleanType => ({
  kind: 'boolean',
  ...args,
})

export const validateNullType: z.ZodType<NullType> = validateBaseType.and(
  z.object({
    kind: z.literal('null'),
  })
)
export interface NullType extends BaseType {
  kind: 'null'
}

export const NullType = (args?: Omit<NullType, 'kind'>): NullType => ({
  kind: 'null',
  ...args,
})

export const validateArrayType: z.ZodType<ArrayType> = validateBaseType.and(
  z.object({
    kind: z.literal('array'),
    items: z.lazy(() => validateTypeDefinition),
    minItems: z.number().optional(),
    maxItems: z.number().optional(),
    uniqueItems: z.boolean().optional(),
  })
)
export interface ArrayType extends BaseType {
  kind: 'array'
  items: TypeDefinition
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
}

export const ArrayType = (args: Omit<ArrayType, 'kind'>): ArrayType => ({
  kind: 'array',
  ...args,
})

export const validateObjectType: z.ZodType<ObjectType> = validateBaseType.and(
  z.object({
    kind: z.literal('object'),
    properties: z.record(z.lazy(() => validateTypeDefinition)),
    required: z.array(z.string()).optional(),
    additionalProperties: z
      .union([z.boolean(), z.lazy(() => validateTypeDefinition)])
      .optional(),
    minProperties: z.number().optional(),
    maxProperties: z.number().optional(),
  })
)
export interface ObjectType extends BaseType {
  kind: 'object'
  properties: Record<string, TypeDefinition>
  required?: string[]
  additionalProperties?: boolean | TypeDefinition
  minProperties?: number
  maxProperties?: number
}

export const ObjectType = (args: Omit<ObjectType, 'kind'>): ObjectType => ({
  kind: 'object',
  ...args,
})

export const validateUnionType: z.ZodType<UnionType> = validateBaseType.and(
  z.object({
    kind: z.literal('union'),
    types: z.array(z.lazy(() => validateTypeDefinition)),
  })
)
export interface UnionType extends BaseType {
  kind: 'union'
  types: TypeDefinition[]
}

export const UnionType = (args: Omit<UnionType, 'kind'>): UnionType => ({
  kind: 'union',
  ...args,
})

export const validateIntersectionType: z.ZodType<IntersectionType> =
  validateBaseType.and(
    z.object({
      kind: z.literal('intersection'),
      types: z.array(z.lazy(() => validateTypeDefinition)),
    })
  )
export interface IntersectionType extends BaseType {
  kind: 'intersection'
  types: TypeDefinition[]
}

export const IntersectionType = (
  args: Omit<IntersectionType, 'kind'>
): IntersectionType => ({
  kind: 'intersection',
  ...args,
})

export const validateLiteralType: z.ZodType<LiteralType> = validateBaseType.and(
  z.object({
    kind: z.literal('literal'),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })
)
export interface LiteralType extends BaseType {
  kind: 'literal'
  value: string | number | boolean
}

export const LiteralType = (args: Omit<LiteralType, 'kind'>): LiteralType => ({
  kind: 'literal',
  ...args,
})

export const validateDateType: z.ZodType<DateType> = validateBaseType.and(
  z.object({
    kind: z.literal('date'),
  })
)
export interface DateType extends BaseType {
  kind: 'date'
}

export const DateType = (args?: Omit<DateType, 'kind'>): DateType => ({
  kind: 'date',
  ...args,
})

export const validateEnumType: z.ZodType<EnumType> = validateBaseType.and(
  z.object({
    kind: z.literal('enum'),
    values: z.array(z.union([z.string(), z.number()])),
    type: z.enum(['string', 'number']),
    name: z.string(),
  })
)
export interface EnumType extends BaseType {
  kind: 'enum'
  values: (string | number)[]
  type: 'string' | 'number'
  name: string
}

export const EnumType = (args: Omit<EnumType, 'kind'>): EnumType => ({
  kind: 'enum',
  ...args,
})

export const validateTypeDefinition: z.ZodType<TypeDefinition> = z.union([
  validateStringType,
  validateNumberType,
  validateBooleanType,
  validateNullType,
  validateArrayType,
  validateObjectType,
  validateUnionType,
  validateIntersectionType,
  validateLiteralType,
  validateDateType,
  validateEnumType,
])

export type TypeDefinition =
  | StringType
  | NumberType
  | BooleanType
  | NullType
  | ArrayType
  | ObjectType
  | UnionType
  | IntersectionType
  | LiteralType
  | DateType
  | EnumType
