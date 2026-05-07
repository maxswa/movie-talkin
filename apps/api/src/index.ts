import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRouter } from "./routes/auth.js";
import { groupsRouter } from "./routes/groups.js";
import { usersRouter } from "./routes/users.js";
import type { AppEnv } from "./lib/types.js";

const app = new OpenAPIHono<AppEnv>();

app.use("*", logger());
app.use("*", cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173", credentials: true }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

app.get("/health", (c) => c.json({ ok: true }));

app.route("/auth", authRouter);
app.route("/users", usersRouter);
app.route("/groups", groupsRouter);

app.doc("/doc", {
  openapi: "3.0.0",
  info: { title: "movie-talkin API", version: "0.1.0" },
});
app.get("/ui", swaggerUI({ url: "/doc" }));

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger UI at http://localhost:${port}/ui`);
});
