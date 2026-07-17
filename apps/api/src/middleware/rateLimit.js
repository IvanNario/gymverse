const buckets = new Map();

function clientKey(request) {
  return request.ip || request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown";
}

export function rateLimit({ windowMs = 60_000, max = 30, name = "default" } = {}) {
  return (request, response, next) => {
    const now = Date.now();
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
