import { eq } from "drizzle-orm";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { verifySessionCookie } from "../lib/session.js";
import type { AppEnv } from "../lib/types.js";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const cookie = getCookie(c, "session");
  if (!cookie) return c.json({ error: "Unauthorized" }, 401);

  const userId = verifySessionCookie(cookie);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  c.set("user", user);
  await next();
});
