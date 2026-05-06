import { and, eq, gt, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { db } from "../db/client.js";
import { magicLinkTokens } from "../db/schema.js";
import { signUserId } from "../lib/session.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../lib/types.js";

export const authRouter = new Hono<AppEnv>()
  .get("/verify", async (c) => {
    const token = c.req.query("token");
    if (!token) return c.json({ error: "Missing token" }, 400);

    const now = new Date().toISOString();

    const record = await db.query.magicLinkTokens.findFirst({
      where: and(
        eq(magicLinkTokens.token, token),
        isNull(magicLinkTokens.usedAt),
        gt(magicLinkTokens.expiresAt, now)
      ),
    });

    if (!record) return c.json({ error: "Invalid or expired token" }, 401);

    await db
      .update(magicLinkTokens)
      .set({ usedAt: now })
      .where(eq(magicLinkTokens.id, record.id));

    setCookie(c, "session", signUserId(record.userId), {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return c.json({ ok: true });
  })
  .post("/logout", (c) => {
    deleteCookie(c, "session", { path: "/" });
    return c.json({ ok: true });
  })
  .get("/me", requireAuth, (c) => {
    const { id, name, email } = c.get("user");
    return c.json({ id, name, email });
  });
