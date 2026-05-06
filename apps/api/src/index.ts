import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRouter } from "./routes/auth.js";
import type { AppEnv } from "./lib/types.js";

const app = new Hono<AppEnv>();

app.use("*", logger());
app.use("*", cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173", credentials: true }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

app.get("/health", (c) => c.json({ ok: true }));

app.route("/auth", authRouter);

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`);
});
