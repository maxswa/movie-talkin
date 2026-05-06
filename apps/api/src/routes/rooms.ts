import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { rooms } from "../db/schema.js";
import { CreateRoomSchema } from "@movie-talkin/shared";

function generateSlug(): string {
  return Math.random().toString(36).slice(2, 8);
}

export const roomsRouter = new Hono()
  .post("/", zValidator("json", CreateRoomSchema), async (c) => {
    const { name } = c.req.valid("json");
    const slug = generateSlug();
    // Placeholder: hostId will come from auth context once auth is added
    const [room] = await db
      .insert(rooms)
      .values({ name, slug, hostId: 1 })
      .returning();
    return c.json(room, 201);
  })
  .get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.slug, slug),
    });
    if (!room) return c.json({ error: "Room not found" }, 404);
    return c.json(room);
  });
