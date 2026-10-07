import test from 'node:test';
import assert from 'node:assert/strict';
import { paginationQuerySchema } from '../src/validations/common.validation.js';
import { currentUserStoriesQuerySchema } from '../src/validations/story.validation.js';
import {
  createPaginatedResult,
  normalizePagination,
} from '../src/utils/pagination.js';

test('normalizes and bounds pagination input', () => {
  assert.deepEqual(normalizePagination(), { limit: 12, offset: 0 });
  assert.deepEqual(normalizePagination({ limit: '500', offset: '-4' }), {
    limit: 50,
    offset: 0,
  });
  assert.deepEqual(normalizePagination({ limit: '8', offset: '16' }), {
    limit: 8,
    offset: 16,
  });
});

test('returns pagination metadata from the database page', () => {
  assert.deepEqual(
    createPaginatedResult({
      items: [{ id: 3 }, { id: 4 }],
      limit: 2,
      offset: 2,
      totalCount: '5',
    }),
    {
      items: [{ id: 3 }, { id: 4 }],
      pagination: {
        limit: 2,
        offset: 2,
        totalCount: 5,
        hasMore: true,
      },
    }
  );
});

test('validates pagination query boundaries at the route layer', () => {
  assert.deepEqual(paginationQuerySchema.parse({ limit: '12', offset: '24' }), {
    limit: 12,
    offset: 24,
  });
  assert.throws(() => paginationQuerySchema.parse({ limit: '51' }));
  assert.throws(() => paginationQuerySchema.parse({ offset: '-1' }));
});

test('validates status filters for the unified user story library', () => {
  assert.deepEqual(
    currentUserStoriesQuerySchema.parse({
      query: { status: 'draft', limit: '12', offset: '0' },
    }).query,
    { status: 'draft', limit: 12, offset: 0 }
  );
  assert.throws(() =>
    currentUserStoriesQuerySchema.parse({ query: { status: 'archived' } })
  );
});
