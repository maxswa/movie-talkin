import { randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./client.js";
import { magicLinkTokens, users, watchGroupMembers, watchGroups } from "./schema.js";

const HOST_NAME = process.env.SEED_HOST_NAME;
const HOST_EMAIL = process.env.SEED_HOST_EMAIL;
const GROUP_NAME = process.env.SEED_GROUP_NAME;
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

if (!HOST_NAME || !GROUP_NAME) {
  console.error("Error: SEED_HOST_NAME and SEED_GROUP_NAME must be set in your .env");
  process.exit(1);
}

// 1. Upsert host user
let user = await db.query.users.findFirst({ where: eq(users.name, HOST_NAME) });
if (!user) {
  const [created] = await db
    .insert(users)
    .values({ name: HOST_NAME, email: HOST_EMAIL })
    .returning();
  user = created;
  console.log(`Created user "${user.name}" (id: ${user.id})`);
} else {
  console.log(`Found existing user "${user.name}" (id: ${user.id})`);
}

// 2. Upsert watch group
let group = await db.query.watchGroups.findFirst({ where: eq(watchGroups.name, GROUP_NAME) });
if (!group) {
  const [created] = await db
    .insert(watchGroups)
    .values({ name: GROUP_NAME })
    .returning();
  group = created;
  console.log(`Created watch group "${group.name}" (id: ${group.id})`);
} else {
  console.log(`Found existing watch group "${group.name}" (id: ${group.id})`);
}

// 3. Add user to group as host (no-op if already a member)
await db
  .insert(watchGroupMembers)
  .values({ groupId: group.id, userId: user.id, role: "host" })
  .onConflictDoNothing();
console.log(`Ensured "${user.name}" is a host of "${group.name}"`);

// 4. Invalidate any existing unused tokens for this user
await db
  .delete(magicLinkTokens)
  .where(and(eq(magicLinkTokens.userId, user.id), isNull(magicLinkTokens.usedAt)));

// 5. Generate a new token (24h expiry)
const token = randomBytes(32).toString("hex");
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
await db.insert(magicLinkTokens).values({ userId: user.id, token, expiresAt });

// 6. Print the magic link
const magicLink = `${APP_URL}/auth/verify?token=${token}`;
console.log(`\nMagic link for "${user.name}":\n\n  ${magicLink}\n\nExpires in 24 hours.`);
