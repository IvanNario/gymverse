import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.mongoUri, {
      dbName: env.mongoDbName,
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (error) {
    const usingAtlas = env.mongoUri.startsWith("mongodb+srv://");
    const message = String(error.message);
    const dnsHint =
      error.code === "ETIMEOUT" || message.includes("querySrv")
        ? "No se pudo resolver el DNS de MongoDB Atlas. Revisa conexion a internet, DNS o usa la cadena standard mongodb:// de Atlas."
        : message.includes("bad auth") || message.includes("authentication failed")
          ? "MongoDB Atlas rechazo las credenciales. Revisa el usuario y password de Database Access, no los de inicio de sesion de Atlas."
          : "No se pudo conectar a MongoDB. Revisa MONGODB_URI, credenciales, IP allowlist y que la base este disponible.";

    console.error(`MongoDB connection failed: ${dnsHint}`);
    if (usingAtlas) {
      console.error("Sugerencia: en Atlas entra a Connect > Drivers y copia la URI. Si mongodb+srv falla por DNS, usa la conexion standard.");
      if (message.includes("bad auth") || message.includes("authentication failed")) {
        console.error("Si tu password contiene @, #, ?, /, :, %, &, + o espacios, debes codificarlo para URL antes de ponerlo en MONGODB_URI.");
        console.error("Tambien confirma que el usuario exista en Atlas > Database Access y tenga permisos readWrite.");
      }
    }
    throw error;
  }
}
