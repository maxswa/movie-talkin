import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, watchGroupMembers, watchGroups, watchParties } from "../db/schema.js";
import { ErrorSchema, GroupDetailSchema, GroupSchema, GroupSummarySchema, WatchPartySchema } from "../lib/schemas.js";
import { requireAuth } from "../middleware/auth.js";
import { requireGroupMember } from "../middleware/group.js";
import type { AppEnv } from "../lib/types.js";

const GroupIdParam = z.object({ groupId: z.string() });

const AddMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(["host", "guest"]).default("guest"),
});

export const groupsRouter = new OpenAPIHono<AppEnv>();

groupsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Groups"],
    summary: "List all groups the current user belongs to",
    middleware: [requireAuth],
    responses: {
      200: { content: { "application/json": { schema: z.array(GroupSummarySchema) } }, description: "Group list" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Not authenticated" },
    },
  }),
  async (c) => {
    const user = c.get("user");

    const rows = await db
      .select({ id: watchGroups.id, name: watchGroups.name, createdAt: watchGroups.createdAt, role: watchGroupMembers.role })
      .from(watchGroupMembers)
      .innerJoin(watchGroups, eq(watchGroupMembers.groupId, watchGroups.id))
      .where(eq(watchGroupMembers.userId, user.id));

    const groups = rows.map((r) => ({ ...r, role: r.role as "host" | "guest" }));
    return c.json(groups, 200);
  }
);

groupsRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Groups"],
    summary: "Create a watch group (creator is added as host)",
    middleware: [requireAuth],
    request: {
      body: { content: { "application/json": { schema: z.object({ name: z.string().min(1).max(100) }) } } },
    },
    responses: {
      201: { content: { "application/json": { schema: GroupSchema } }, description: "Group created" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Not authenticated" },
    },
  }),
  async (c) => {
    const { name } = c.req.valid("json");
    const user = c.get("user");

    const [group] = await db.insert(watchGroups).values({ name }).returning();
    await db.insert(watchGroupMembers).values({ groupId: group.id, userId: user.id, role: "host" });

    return c.json(group, 201);
  }
);

groupsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{groupId}",
    tags: ["Groups"],
    summary: "Get group details and member list",
    middleware: [requireAuth, requireGroupMember()],
    request: { params: GroupIdParam },
    responses: {
      200: { content: { "application/json": { schema: GroupDetailSchema } }, description: "Group details" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Not authenticated" },
      403: { content: { "application/json": { schema: ErrorSchema } }, description: "Not a member" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Group not found" },
    },
  }),
  async (c) => {
    const { groupId } = c.req.valid("param");

    const group = await db.query.watchGroups.findFirst({ where: eq(watchGroups.id, groupId) });
    if (!group) return c.json({ error: "Group not found" }, 404);

    const members = await db
      .select({ userId: users.id, name: users.name, role: watchGroupMembers.role, joinedAt: watchGroupMembers.joinedAt })
      .from(watchGroupMembers)
      .innerJoin(users, eq(watchGroupMembers.userId, users.id))
      .where(eq(watchGroupMembers.groupId, groupId));

    const typedMembers = members.map((m) => ({ ...m, role: m.role as "host" | "guest" }));
    return c.json({ ...group, members: typedMembers }, 200);
  }
);

groupsRouter.openapi(
  createRoute({
    method: "post",
    path: "/{groupId}/members",
    tags: ["Groups"],
    summary: "Add a user to the group (host only)",
    middleware: [requireAuth, requireGroupMember("host")],
    request: {
      params: GroupIdParam,
      body: { content: { "application/json": { schema: AddMemberSchema } } },
    },
    responses: {
      201: { content: { "application/json": { schema: z.object({ ok: z.boolean() }) } }, description: "Member added" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Not authenticated" },
      403: { content: { "application/json": { schema: ErrorSchema } }, description: "Not a host" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "User not found" },
      409: { content: { "application/json": { schema: ErrorSchema } }, description: "Already a member" },
    },
  }),
  async (c) => {
    const { groupId } = c.req.valid("param");
    const { userId, role } = c.req.valid("json");

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return c.json({ error: "User not found" }, 404);

    const existing = await db.query.watchGroupMembers.findFirst({
      where: and(eq(watchGroupMembers.groupId, groupId), eq(watchGroupMembers.userId, userId)),
    });
    if (existing) return c.json({ error: "Already a member" }, 409);

    await db.insert(watchGroupMembers).values({ groupId, userId, role });
    return c.json({ ok: true }, 201);
  }
);

groupsRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{groupId}/members/{userId}",
    tags: ["Groups"],
    summary: "Remove a member from the group (host only, cannot remove last host)",
    middleware: [requireAuth, requireGroupMember("host")],
    request: { params: z.object({ groupId: z.string(), userId: z.string() }) },
    responses: {
      200: { content: { "application/json": { schema: z.object({ ok: z.boolean() }) } }, description: "Member removed" },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Cannot remove the last host" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Not authenticated" },
      403: { content: { "application/json": { schema: ErrorSchema } }, description: "Not a host" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Member not found" },
    },
  }),
  async (c) => {
    const { groupId, userId } = c.req.valid("param");

    const member = await db.query.watchGroupMembers.findFirst({
      where: and(eq(watchGroupMembers.groupId, groupId), eq(watchGroupMembers.userId, userId)),
    });
    if (!member) return c.json({ error: "Member not found" }, 404);

    if (member.role === "host") {
      const [{ hostCount }] = await db
        .select({ hostCount: count() })
        .from(watchGroupMembers)
        .where(and(eq(watchGroupMembers.groupId, groupId), eq(watchGroupMembers.role, "host")));

      if (hostCount <= 1) return c.json({ error: "Cannot remove the last host" }, 400);
    }

    await db
      .delete(watchGroupMembers)
      .where(and(eq(watchGroupMembers.groupId, groupId), eq(watchGroupMembers.userId, userId)));

    return c.json({ ok: true }, 200);
  }
);

groupsRouter.openapi(
  createRoute({
    method: "post",
    path: "/{groupId}/parties",
    tags: ["Parties"],
    summary: "Create a watch party for the group (host only)",
    middleware: [requireAuth, requireGroupMember("host")],
    request: { params: GroupIdParam },
    responses: {
      201: { content: { "application/json": { schema: WatchPartySchema } }, description: "Party created" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Not authenticated" },
      403: { content: { "application/json": { schema: ErrorSchema } }, description: "Not a host" },
    },
  }),
  async (c) => {
    const { groupId } = c.req.valid("param");
    const [party] = await db.insert(watchParties).values({ watchGroupId: groupId }).returning();
    return c.json({ ...party, status: party.status as "draft" }, 201);
  }
);
