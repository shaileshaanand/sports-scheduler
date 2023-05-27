import { z } from "zod";

import app, { log } from "./app.js";
try {
  z.object({
    SESSION_SECRET: z.string().nonempty(),
    REDIS_URL: z.string().nonempty(),
    DATABASE_URL: z.string().nonempty(),
    CSRF_SECRET: z.string().nonempty(),
  }).parse(process.env);
} catch (e) {
  if (e instanceof z.ZodError) {
    log.error({ errors: e.errors });
    process.exit(1);
  } else {
    throw e;
  }
}

const port = process.env.PORT || 3000;
await app.listen(port);
log.info(`Server running on port ${port}`);
