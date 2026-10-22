import { z } from 'zod';
import { nonEmptyString, paginationQuerySchema } from './common.validation.js';

export const adminListSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: paginationQuerySchema,
});

export const adminUserLibrarySchema = z.object({
  params: z.object({ userId: z.string().uuid('Valid user ID is required') }),
  query: paginationQuerySchema,
});

export const adminStoryIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ storyId: nonEmptyString('Story ID') }),
  query: z.object({}).optional(),
});

export const adminUserIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    userId: z.string().uuid('Valid user ID is required'),
  }),
  query: z.object({}).optional(),
});
