import app, { log } from "./app.js";

const port = process.env.PORT || 3000;
await app.listen(port);
log.info(`Server running on port ${port}`);
