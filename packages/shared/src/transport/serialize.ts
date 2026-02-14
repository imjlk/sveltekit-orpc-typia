type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type SerializeForTransport<T> =
  T extends Date
    ? string
    : T extends Primitive
      ? T
      : T extends ReadonlyArray<infer U>
        ? SerializeForTransport<U>[]
        : { [K in keyof T]: SerializeForTransport<T[K]> };

/**
 * Runtime serializer for transport DTOs.
 *
 * - Converts `Date` to ISO string (`toISOString()`).
 * - Recursively processes arrays and plain objects.
 *
 * Note: This is intentionally minimal and optimized for DB row -> DTO use cases.
 */
export const serializeForTransport = <T>(input: T): SerializeForTransport<T> =>
  _serializeForTransport(input) as SerializeForTransport<T>;

const _serializeForTransport = (input: unknown): unknown => {
  if (input instanceof Date) return input.toISOString();
  if (input === null) return null;

  if (Array.isArray(input)) return input.map(_serializeForTransport);

  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const key of Object.keys(obj)) {
      out[key] = _serializeForTransport(obj[key]);
    }

    return out;
  }

  return input;
};
