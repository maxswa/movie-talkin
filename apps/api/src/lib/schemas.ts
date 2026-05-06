import { z } from "zod";

export const ErrorSchema = z.object({ error: z.string() });
export const OkSchema = z.object({ ok: z.boolean() });

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().nullable(),
  createdAt: z.string(),
});
