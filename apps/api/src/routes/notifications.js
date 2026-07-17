import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

function notificationFilter(user) {
  const roles = user.role === "staff" ? ["staff", "admin"] : [user.role];
  return {
    clearedBy: { $ne: user._id },
    $or: [{ recipient: user._id }, { role: { $in: roles } }],
  };
}

function userHasRead(notification, userId) {
  return Boolean(notification.readAt || notification.readBy?.some((entry) => entry.equals(userId)));
}

function presentNotification(notification, userId) {
  const data = notification.toObject();
  data.noticeCode = data.noticeCode || `AV-${String(data._id).slice(-6).toUpperCase()}`;
  if (!data.readAt && notification.readBy?.some((entry) => entry.equals(userId))) {
    data.readAt = notification.updatedAt;
  }
  delete data.readBy;
  delete data.clearedBy;
  return data;
}

notificationsRouter.get("/", async (request, response) => {
  const notifications = await Notification.find(notificationFilter(request.user)).sort({ createdAt: -1 }).limit(80);
  const unread = notifications.filter((notification) => !userHasRead(notification, request.user._id)).length;
  response.json({ notifications: notifications.map((notification) => presentNotification(notification, request.user._id)), unread });
});

notificationsRouter.patch("/read-all", async (request, response) => {
  await Promise.all([
    Notification.updateMany({ recipient: request.user._id, readAt: { $exists: false } }, { readAt: new Date() }),
    Notification.updateMany(
      { ...notificationFilter(request.user), role: { $exists: true }, readBy: { $ne: request.user._id } },
      { $addToSet: { readBy: request.user._id } }
    ),
  ]);
  response.json({ ok: true });
});

notificationsRouter.delete("/", async (request, response) => {
  await Promise.all([
    Notification.deleteMany({ recipient: request.user._id }),
    Notification.updateMany(
      { ...notificationFilter(request.user), role: { $exists: true }, clearedBy: { $ne: request.user._id } },
      { $addToSet: { clearedBy: request.user._id, readBy: request.user._id } }
    ),
  ]);
  response.json({ ok: true });
});

notificationsRouter.patch("/:id/read", async (request, response) => {
  const notification = await Notification.findOne({ _id: request.params.id, ...notificationFilter(request.user) });
  if (!notification) return response.status(404).json({ message: "Notificación no encontrada" });
  if (notification.recipient?.equals(request.user._id)) {
    notification.readAt = new Date();
  } else {
    notification.readBy.addToSet(request.user._id);
  }
  await notification.save();
  response.json({ notification: presentNotification(notification, request.user._id) });
});
