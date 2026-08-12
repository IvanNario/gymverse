import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

function notificationFilter(user) {
  return {
    clearedBy: { $ne: user._id },
    recipient: user._id,
  };
}

function userHasRead(notification) {
  return Boolean(notification.readAt);
}

function presentNotification(notification) {
  const data = notification.toObject();
  data.noticeCode = data.noticeCode || `AV-${String(data._id).slice(-6).toUpperCase()}`;
  delete data.readBy;
  delete data.clearedBy;
  return data;
}

notificationsRouter.get("/", async (request, response) => {
  const notifications = await Notification.find(notificationFilter(request.user)).sort({ createdAt: -1 }).limit(80);
  const unread = notifications.filter((notification) => !userHasRead(notification)).length;
  response.json({ notifications: notifications.map((notification) => presentNotification(notification)), unread });
});

notificationsRouter.patch("/read-all", async (request, response) => {
  await Notification.updateMany({ recipient: request.user._id, readAt: { $exists: false } }, { readAt: new Date() });
  response.json({ ok: true });
});

notificationsRouter.delete("/", async (request, response) => {
  await Notification.deleteMany({ recipient: request.user._id });
  response.json({ ok: true });
});

notificationsRouter.patch("/:id/read", async (request, response) => {
  const notification = await Notification.findOne({ _id: request.params.id, ...notificationFilter(request.user) });
  if (!notification) return response.status(404).json({ message: "Notificación no encontrada" });
  notification.readAt = new Date();
  await notification.save();
  response.json({ notification: presentNotification(notification) });
});
