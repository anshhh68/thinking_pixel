function getPagination(query) {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt(query.pageSize || "20", 10), 1), 100);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

function paginatedResponse({ items, total, page, pageSize }) {
  return {
    items,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

module.exports = {
  getPagination,
  paginatedResponse,
};
