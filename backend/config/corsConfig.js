// CORS configuration — origins are read exclusively from environment variables.
// Never allow origin: "*" in production; that disables cookie-based auth and
// exposes every authenticated endpoint to any website.
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
].filter(Boolean); // strip undefined / empty strings

const corsConfig = {
  origin: (origin, callback) => {
    // Permit requests with no Origin header (server-to-server, Postman, curl).
    if (!origin) return callback(null, true);

    // In development, if no origins are configured, allow all (dev convenience).
    if (allowedOrigins.length === 0) {
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      return callback(new Error("CORS: no allowed origins configured"));
    }

    if (allowedOrigins.includes(origin)) return callback(null, true);

    return callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  credentials: true,                           // Required for cookie-based auth
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204,                   // Some legacy browsers choke on 200
};

module.exports = corsConfig;
