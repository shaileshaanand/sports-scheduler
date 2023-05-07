import app from "./app.js";

const port = process.env.PORT || 3000;
await app.listen(port);
console.log(`Server running on port ${port}`);
