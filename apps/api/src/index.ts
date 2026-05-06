import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { roomsRouter } from "./routes/rooms.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));

app.get("/health", (c) => c.json({ ok: true }));

app.route("/rooms", roomsRouter);

const port = Number(process.env.PORT ?? 3000);
console.log(`API running on http://localhost:${port}`);

export default { fetch: app.fetch, port };
