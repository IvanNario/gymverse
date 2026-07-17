import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";

function createNoticeCode() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AV-${year}${month}-${suffix}`;
}

export async function createNotification({ recipient, role, title, message, type = "info", linkType, linkId }) {
  if (!recipient && role) {
    const roles = role === "admin" ? ["admin", "staff"] : [role];
    const users = await User.find({ role: { $in: roles }, status: { $ne: "disabled" } }).select("_id role");
    if (users.length) {
      return Notification.insertMany(
        users.map((user) => ({
          recipient: user._id,
          role: user.role,
          noticeCode: createNoticeCode(),
          title,
          message,
          type,
          linkType,
          linkId,
        }))
      );
    }
  }
  return Notification.create({
    recipient,
    role,
    noticeCode: createNoticeCode(),
    title,
    message,
    type,
    linkType,
    linkId,
  });
}

export async function notifyAdmins(payload) {
  return createNotification({ ...payload, role: "admin" });
}
