import type { users } from '../db/schema.js';

export type AppEnv = {
  Variables: {
    user: typeof users.$inferSelect;
  };
};
