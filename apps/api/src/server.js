import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";

try {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`GymVerse API listening on http://localhost:${env.port}`);
  });
} catch {
  process.exit(1);
}
