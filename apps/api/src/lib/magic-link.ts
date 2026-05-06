import { randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { magicLinkTokens } from "../db/schema.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

export async function generateMagicLink(userId: number): Promise<string> {
  await db
    .delete(magicLinkTokens)
    .where(and(eq(magicLinkTokens.userId, userId), isNull(magicLinkTokens.usedAt)));

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await db.insert(magicLinkTokens).values({ userId, token, expiresAt });

  return `${APP_URL}/auth/verify?token=${token}`;
}
