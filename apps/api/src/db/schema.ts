import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const rooms = sqliteTable("rooms", {
  id: int("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  hostId: int("host_id")
    .notNull()
    .references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const roomMembers = sqliteTable("room_members", {
  roomId: int("room_id")
    .notNull()
    .references(() => rooms.id),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  joinedAt: text("joined_at").notNull().default(sql`(current_timestamp)`),
});
