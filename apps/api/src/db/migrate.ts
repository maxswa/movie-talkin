import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const client = createClient({
  url: process.env.DB_URL ?? "file:./movie-talkin.db",
  authToken: process.env.DB_AUTH_TOKEN,
});

const db = drizzle(client);
await migrate(db, { migrationsFolder: "./src/db/migrations" });
console.log("Migrations applied.");
client.close();
