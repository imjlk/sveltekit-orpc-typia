import { badRequest } from './errors';

export const trimRequired = (fieldLabel: string, value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw badRequest(`${fieldLabel} is required`, { reason: `${fieldLabel} is required` });
  }
  return trimmed;
};

export const dedupeNumbers = (values: number[]) => Array.from(new Set(values));

