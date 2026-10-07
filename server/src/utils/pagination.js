const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

export const normalizePagination = ({ limit, offset } = {}) => {
  const parsedLimit = Number(limit ?? DEFAULT_PAGE_SIZE);
  const parsedOffset = Number(offset ?? 0);

  return {
    limit: Number.isFinite(parsedLimit)
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(parsedLimit)))
      : DEFAULT_PAGE_SIZE,
    offset: Number.isFinite(parsedOffset)
      ? Math.max(0, Math.floor(parsedOffset))
      : 0,
  };
};

export const createPaginatedResult = ({ items, limit, offset, totalCount }) => {
  const safeTotalCount = Math.max(0, Number(totalCount) || 0);

  return {
    items,
    pagination: {
      limit,
      offset,
      totalCount: safeTotalCount,
      hasMore: offset + items.length < safeTotalCount,
    },
  };
};
