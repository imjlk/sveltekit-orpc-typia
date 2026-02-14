import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { IJsonSchemaUnit } from 'typia';

// A lightweight convention to attach OpenAPI/JSON-schema metadata to standard schemas.
// @orpc/openapi converts validation schemas to JSON Schemas; typia validators do not expose
// JSON schema at runtime, so we attach `typia.json.schema<T>()` outputs here.

export const OPENAPI_UNIT_KEY = '__openapiUnit' as const;

export type OpenApiJsonSchemaUnit<T> = IJsonSchemaUnit<'3.1', T>;

type WithOpenApiUnit<TUnit> = {
  [OPENAPI_UNIT_KEY]?: OpenApiJsonSchemaUnit<TUnit>;
};

export const attachOpenApiUnit = <TInput, TOutput, TUnit>(
  schema: StandardSchemaV1<TInput, TOutput>,
  unit: OpenApiJsonSchemaUnit<TUnit>,
): StandardSchemaV1<TInput, TOutput> & WithOpenApiUnit<TUnit> => {
  (schema as StandardSchemaV1<TInput, TOutput> & WithOpenApiUnit<TUnit>)[OPENAPI_UNIT_KEY] = unit;
  return schema as StandardSchemaV1<TInput, TOutput> & WithOpenApiUnit<TUnit>;
};

export const getOpenApiUnit = <TUnit>(schema: unknown): OpenApiJsonSchemaUnit<TUnit> | undefined => {
  if (!schema || typeof schema !== 'object') return undefined;
  return (schema as WithOpenApiUnit<TUnit>)[OPENAPI_UNIT_KEY];
};

