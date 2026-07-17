import dns from "node:dns/promises";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";

function hideUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
}

console.log("GymVerse API doctor");
console.log(`Mongo URI: ${hideUri(env.mongoUri)}`);
console.log(`Mongo DB: ${env.mongoDbName}`);

if (!env.mongoUri) {
  console.error("Falta MONGODB_URI en .env");
  process.exit(1);
}

if (env.mongoUri.startsWith("mongodb+srv://")) {
  const host = env.mongoUri.split("@").pop().split("/")[0].split("?")[0];
  const srvHost = `_mongodb._tcp.${host}`;
  try {
    const records = await dns.resolveSrv(srvHost);
    console.log(`DNS SRV OK: ${records.length} host(s) encontrados`);
  } catch (error) {
    console.error(`DNS SRV fallo para ${srvHost}: ${error.code || error.message}`);
    console.error("Solucion: cambia DNS/red o copia desde Atlas la URI standard mongodb:// en lugar de mongodb+srv://.");
    process.exit(1);
  }
}

try {
  await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDbName,
    serverSelectionTimeoutMS: 15000,
  });
  console.log(`MongoDB OK: conectado a ${mongoose.connection.name}`);
  await mongoose.disconnect();
} catch (error) {
  const message = String(error.message);
  console.error(`MongoDB fallo: ${message}`);
  if (message.includes("bad auth") || message.includes("authentication failed")) {
    console.error("Diagnostico: Atlas encontro el cluster, pero usuario/password no son validos.");
    console.error("Usa un Database User de Atlas > Database Access, no tu cuenta de login de Atlas.");
    console.error("Si el password tiene caracteres especiales, codificalo para URL dentro de MONGODB_URI.");
    console.error("Ejemplo: @ debe ir como %40, # como %23, ? como %3F, / como %2F.");
  } else {
    console.error("Revisa usuario, password, Network Access/IP allowlist de Atlas y que el cluster este activo.");
  }
  process.exit(1);
}
