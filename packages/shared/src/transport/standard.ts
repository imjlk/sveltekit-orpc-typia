import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Wrap a standard schema with a mapping function.
 *
 * This is useful when your handler returns a "server shape" (e.g. DB row with `Date`)
 * but your contract exposes a "transport shape" (e.g. DTO with ISO date strings).
 */
export const mapStandardSchema = <TInput, TOutput>(
  schema: StandardSchemaV1<TOutput, TOutput>,
  map: (input: TInput) => TOutput,
): StandardSchemaV1<TInput, TOutput> => ({
  '~standard': {
    version: 1,
    vendor: schema['~standard'].vendor,
    validate: (value: unknown, options) => schema['~standard'].validate(map(value as TInput), options),
  },
});

