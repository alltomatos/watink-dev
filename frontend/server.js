// Simple express server to serve the frontend production build (SPA).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require("express");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
const app = express();

// Basic in-memory rate limiter: max 100 requests per IP per 60 seconds.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 100;
const ipCounters = new Map();
function rateLimiter(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = ipCounters.get(ip);
  if (!entry || now - entry.ts > RATE_WINDOW_MS) {
    ipCounters.set(ip, { ts: now, count: 1 });
    return next();
  }
  entry.count += 1;
  if (entry.count > RATE_MAX) {
    res.status(429).set("Retry-After", "60").send("Too Many Requests");
    return;
  }
  next();
}

app.use(rateLimiter);
app.use(express.static(path.join(__dirname, "build")));
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});
app.listen(3333);
