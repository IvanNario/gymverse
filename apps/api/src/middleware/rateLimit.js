const buckets = new Map();
const MAX_BUCKETS = 5000;

function clientKey(request) {
  const forwardedFor = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return request.ip || forwardedFor || request.socket?.remoteAddress || "unknown";
}

function pruneExpiredBuckets(now) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size <= MAX_BUCKETS) return;
  const overflow = buckets.size - MAX_BUCKETS;
  let removed = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

export function rateLimit({ windowMs = 60_000, max = 30, name = "default" } = {}) {
  return (request, response, next) => {
    const now = Date.now();
    if (buckets.size > MAX_BUCKETS || Math.random() < 0.01) pruneExpiredBuckets(now);
    const key = `${name}:${clientKey(request)}`;
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    response.setHeader("X-RateLimit-Limit", String(max));
    response.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    response.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      return response.status(429).json({ message: "Demasiados intentos. Intenta de nuevo en unos minutos." });
    }

    next();
  };
}
