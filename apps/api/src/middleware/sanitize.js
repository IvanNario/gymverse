const UNSAFE_KEYS = ["__proto__", "constructor", "prototype"];

function hasUnsafeKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasUnsafeKey);
  return Object.keys(value).some((key) => {
    if (UNSAFE_KEYS.includes(key) || key.startsWith("$") || key.includes(".")) return true;
    return hasUnsafeKey(value[key]);
  });
}

export function rejectUnsafePayload(request, response, next) {
  if (hasUnsafeKey(request.body) || hasUnsafeKey(request.params) || hasUnsafeKey(request.query)) {
    return response.status(400).json({ message: "Solicitud inválida" });
  }
  next();
}
