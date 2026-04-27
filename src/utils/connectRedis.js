import Redis from "ioredis";
import dotenv from 'dotenv';

dotenv.config();

let redisClient;

async function connectRedis() {
  const isDev = process.argv.includes("--dev");

  if (redisClient) {
    return redisClient;
  }

  if (isDev) {
    // Local Redis (default: localhost:6379, no password)
    redisClient = new Redis({
      host: "127.0.0.1",
      port: 6379,
      password: ""
    });
    console.log("🟡 Connecting to Redis (Local Dev Mode)...");
  } else {
    // Production Redis (from .env)
    redisClient = new Redis({
      host: process.env.redisHost,
      port: process.env.redisPort,
      password: process.env.redisPass,
    });
    console.log(`🟡 Connecting to Redis (Env Config: ${process.env.redisHost})...`);
  }

  // Connection success event
  redisClient.on("connect", () => {
    console.log(`✅ Redis connected successfully! (Env Config: ${process.env.redisHost})...`);
  });

  // Error handling
  redisClient.on("error", (err) => {
    console.error("❌ Redis connection error:", err);
  });

  // Reconnect attempt event
  redisClient.on("reconnecting", () => {
    console.log("♻️  Attempting to reconnect to Redis...");
  });

  return redisClient;
}

export default connectRedis;
