import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { db } from "../db/client.js";
import { watchGroupMembers } from "../db/schema.js";
import type { AppEnv } from "../lib/types.js";

export const requireGroupMember = (role?: "host") =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    const groupId = Number(c.req.param("groupId"));

    if (!groupId) return c.json({ error: "Missing groupId" }, 400);

    const member = await db.query.watchGroupMembers.findFirst({
      where: and(
        eq(watchGroupMembers.groupId, groupId),
        eq(watchGroupMembers.userId, user.id)
      ),
    });

    if (!member) return c.json({ error: "Forbidden" }, 403);
    if (role === "host" && member.role !== "host") return c.json({ error: "Forbidden" }, 403);

    await next();
  });
