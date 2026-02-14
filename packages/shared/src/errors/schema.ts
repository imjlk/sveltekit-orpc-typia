import typia from 'typia';
import { attachOpenApiUnit } from '../transport/openapi';
import type { BadRequestData, NotFoundData } from './types';

export const badRequestDataSchema = attachOpenApiUnit(
  typia.createValidate<BadRequestData>(),
  typia.json.schema<BadRequestData>(),
);

export const notFoundDataSchema = attachOpenApiUnit(
  typia.createValidate<NotFoundData>(),
  typia.json.schema<NotFoundData>(),
);

