import typia from 'typia';
import { typiaSchema } from '../transport/typia';
import type { BadRequestData, NotFoundData, RateLimitedData } from './types';

export const badRequestDataSchema = typiaSchema(
  typia.createValidate<BadRequestData>(),
  typia.json.schema<BadRequestData>(),
);

export const notFoundDataSchema = typiaSchema(typia.createValidate<NotFoundData>(), typia.json.schema<NotFoundData>());

export const rateLimitedDataSchema = typiaSchema(
  typia.createValidate<RateLimitedData>(),
  typia.json.schema<RateLimitedData>(),
);
