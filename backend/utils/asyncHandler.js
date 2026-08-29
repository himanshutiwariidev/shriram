// Wraps an async route handler so that any rejected promise is forwarded to
// Express's next(err) and caught by the centralised error handler.
// Usage: router.get("/path", asyncHandler(async (req, res) => { ... }));
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
