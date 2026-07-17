import mongoose from "mongoose";

export function cleanString(value, max = 240) {
  return String(value || "").trim().slice(0, max);
}

export function normalizeEmail(value) {
  return cleanString(value, 180).toLowerCase();
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

export function isStrongEnoughPassword(value) {
  const password = String(value || "");
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function isValidOptionalPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return !digits || (digits.length >= 8 && digits.length <= 15);
}

export function positiveInt(value, { min = 1, max = 99 } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

export function validObjectId(value) {
  return mongoose.isValidObjectId(value);
}

export function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
