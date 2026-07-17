import { AuditLog } from "../models/AuditLog.js";
import { redactForLog } from "./privacy.js";

export async function writeAuditLog(request, { action, resource = "", resourceId = "", metadata = {} }) {
  try {
    await AuditLog.create({
      actor: request.user?._id,
      actorRole: request.user?.role || "",
      action,
      resource,
      resourceId: String(resourceId || ""),
      ip: request.ip || "",
      userAgent: String(request.headers["user-agent"] || "").slice(0, 280),
      metadata: redactForLog(metadata),
    });
  } catch (error) {
    console.error("Audit log error", { message: error.message, action, resource });
  }
}
