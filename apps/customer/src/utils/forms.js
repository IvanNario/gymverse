export function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function digitsOnly(value = "") {
  return String(value || "").replace(/\D/g, "");
}

export function isValidPhone(value = "") {
  const digits = digitsOnly(value);
  return !digits || (digits.length >= 8 && digits.length <= 15);
}

export function passwordStrengthMessage(value = "") {
  const password = String(value || "");
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Usa letras y números para una contraseña más segura";
  return "";
}

export function validateAuthForm(mode, form) {
  if (mode === "register" && String(form.name || "").trim().length < 3) return "Escribe tu nombre completo";
  if (mode === "register" && !isValidPhone(form.phone)) return "Revisa el número telefónico";
  if (!isValidEmail(form.email)) return "Escribe un correo válido";
  const passwordMessage = passwordStrengthMessage(form.password);
  if (passwordMessage) return passwordMessage;
  if (mode === "register" && form.password !== form.confirmPassword) return "Las contraseñas no coinciden";
  return "";
}

export function validateProfile(profile) {
  if (String(profile.name || "").trim().length < 3) return "Escribe tu nombre completo";
  if (!isValidPhone(profile.phone)) return "Revisa el número telefónico";
  return "";
}

export function validateAddress(address = {}) {
  const required = ["label", "street", "city", "state", "zip", "phone"];
  if (required.some((key) => !String(address[key] || "").trim())) return "Completa todos los datos del domicilio";
  if (!isValidPhone(address.phone)) return "Revisa el teléfono del domicilio";
  if (digitsOnly(address.zip).length < 4) return "Revisa el código postal";
  return "";
}

export function validatePasswordChange(form) {
  if (!form.currentPassword) return "Escribe tu contraseña actual";
  const passwordMessage = passwordStrengthMessage(form.newPassword);
  if (passwordMessage) return passwordMessage;
  if (form.currentPassword === form.newPassword) return "La nueva contraseña debe ser diferente a la actual";
  if (form.newPassword !== form.confirmPassword) return "Las contraseñas no coinciden";
  return "";
}

export function validateSupportTicket(form) {
  if (String(form.subject || "").trim().length < 5) return "Escribe un asunto más claro";
  if (String(form.message || "").trim().length < 15) return "Describe tu caso con un poco más de detalle";
  return "";
}

export function validateReturnReason(reason = "") {
  if (String(reason).trim().length < 15) return "Describe el motivo de devolución con más detalle";
  return "";
}
