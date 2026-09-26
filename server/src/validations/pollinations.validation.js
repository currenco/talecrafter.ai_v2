import { z } from 'zod';
import { nonEmptyString } from './common.validation.js';

export const pollinationsCallbackSchema = z.object({
  body: z.object({
    code: nonEmptyString('Authorization code'),
    state: nonEmptyString('Authorization state'),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
