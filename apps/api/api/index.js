import { app } from "../src/app.js";
import { connectDatabase } from "../src/config/db.js";

export default async function handler(request, response) {
  await connectDatabase();
  return app(request, response);
}
