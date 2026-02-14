import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { OpenApiJsonSchemaUnit } from './openapi';
import { attachOpenApiUnit } from './openapi';
import { mapStandardSchema } from './standard';

/**
 * Attach a typia JSON Schema unit to a StandardSchemaV1 validator so `@orpc/openapi`
 * can convert it to OpenAPI schemas.
 */
export const typiaSchema = <T>(
  validate: StandardSchemaV1<T, T>,
  unit: OpenApiJsonSchemaUnit<T>,
): StandardSchemaV1<T, T> => attachOpenApiUnit(validate, unit);

/**
 * Output schema helper for "server shape" -> "transport DTO shape" mappings.
 */
export const typiaMappedSchema = <TInput, TOutput>(
  dtoSchema: StandardSchemaV1<TOutput, TOutput>,
  map: (input: TInput) => TOutput,
): StandardSchemaV1<TInput, TOutput> => mapStandardSchema(dtoSchema, map);
