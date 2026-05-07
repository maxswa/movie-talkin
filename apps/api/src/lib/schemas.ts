import { z } from "zod";

export const ErrorSchema = z.object({ error: z.string() });
export const OkSchema = z.object({ ok: z.boolean() });

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  createdAt: z.string(),
});

export const GroupMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: z.enum(["host", "guest"]),
  joinedAt: z.string(),
});

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export const GroupDetailSchema = GroupSchema.extend({
  members: z.array(GroupMemberSchema),
});

export const GroupSummarySchema = GroupSchema.extend({
  role: z.enum(["host", "guest"]),
});
