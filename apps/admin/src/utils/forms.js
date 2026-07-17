export function passwordValidationMessage(password = "", { optional = false } = {}) {
  const value = String(password || "");
  if (optional && !value) return "";
  if (value.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "La contraseña debe incluir letras y números";
  return "";
}
