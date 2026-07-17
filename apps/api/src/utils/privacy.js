const PRIVATE_FIELDS = new Set([
  "password",
  "passwordHash",
  "token",
  "idToken",
  "credential",
  "googleSubject",
  "authorization",
  "paymentUrl",
  "providerPaymentId",
  "providerPreferenceId",
  "paymentCard",
  "card",
]);

export function maskEmail(email = "") {
  const [name = "", domain = ""] = String(email).split("@");
  if (!name || !domain) return "";
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

export function maskPhone(phone = "") {
  const text = String(phone || "").replace(/\s+/g, "");
  if (text.length <= 4) return text ? "****" : "";
  return `${"*".repeat(Math.max(4, text.length - 4))}${text.slice(-4)}`;
}

export function privateAddress(address = {}) {
  if (!address) return undefined;
  return {
    label: address.label,
    street: address.street,
    city: address.city,
    state: address.state,
    zip: address.zip,
    phone: address.phone,
  };
}

export function publicAddress(address = {}) {
  if (!address) return undefined;
  return {
    label: address.label,
    city: address.city,
    state: address.state,
    zip: address.zip,
    phone: maskPhone(address.phone),
  };
}

export function publicUserProfile(user, { includePrivate = false } = {}) {
  if (!user) return null;
  return {
    id: user._id,
    name: user.name,
    email: includePrivate ? user.email : maskEmail(user.email),
    phone: includePrivate ? user.phone : maskPhone(user.phone),
    role: user.role,
    status: user.status,
    gym: user.gym,
    affiliatedGyms: (user.affiliatedGyms || []).map((gym) => gym._id?.toString?.() || gym.toString()),
    adminRolePreset: user.adminRolePreset,
    permissions: user.permissions || [],
    addresses: includePrivate ? (user.addresses || []).map(privateAddress) : [],
    favorites: (user.favorites || []).map((favorite) => favorite._id?.toString?.() || favorite.toString()),
    points: user.points,
  };
}

export function publicCustomer(user, { includePrivate = false } = {}) {
  if (!user) return null;
  return {
    id: user._id,
    name: user.name,
    email: includePrivate ? user.email : maskEmail(user.email),
  };
}

export function publicSupplier(supplier, { includePrivate = false } = {}) {
  if (!supplier) return null;
  const json = supplier.toJSON ? supplier.toJSON() : supplier;
  return {
    ...json,
    email: includePrivate ? json.email : maskEmail(json.email),
    phone: includePrivate ? json.phone : maskPhone(json.phone),
  };
}

export function publicGym(gym, { includePrivate = false } = {}) {
  if (!gym) return null;
  const json = gym.toJSON ? gym.toJSON() : gym;
  return {
    ...json,
    phone: includePrivate ? json.phone : maskPhone(json.phone),
    accessUser: json.accessUser
      ? {
          ...json.accessUser,
          email: includePrivate ? json.accessUser.email : maskEmail(json.accessUser.email),
        }
      : json.accessUser,
  };
}

export function publicOrder(order, { viewer = null, includePrivate = false } = {}) {
  const json = order?.toJSON ? order.toJSON() : order;
  if (!json) return null;
  const ownsOrder = viewer?._id?.toString?.() === json.customer?._id?.toString?.() || viewer?._id?.toString?.() === json.customer?.toString?.();
  const allowPrivate = includePrivate || ownsOrder || viewer?.role === "admin";
  const customer = json.customer && typeof json.customer === "object" ? publicCustomer(json.customer, { includePrivate: allowPrivate }) : json.customer;
  return {
    ...json,
    customer,
    shippingAddress: allowPrivate ? privateAddress(json.shippingAddress) : publicAddress(json.shippingAddress),
    paymentCard: undefined,
    paymentUrl: ownsOrder && json.status === "pending_payment" ? json.paymentUrl : undefined,
    providerPreferenceId: undefined,
    providerPaymentId: undefined,
  };
}

export function redactForLog(value, depth = 0) {
  if (depth > 8) return "[redacted-depth]";
  if (Array.isArray(value)) return value.map((item) => redactForLog(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      PRIVATE_FIELDS.has(key) || key.toLowerCase().includes("password") ? "[redacted]" : redactForLog(entry, depth + 1),
    ])
  );
}
