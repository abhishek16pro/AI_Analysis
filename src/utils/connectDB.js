import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  const mongoDbName = process.env.MONGODB_NAME || "XTS";
  const serverIp = "localhost";
  const isDev = process.argv.includes("--dev");

  const mongoUsername = encodeURIComponent(process.env.MONGO_USERNAME);
  const mongoPassword = encodeURIComponent(process.env.MONGO_PASSWORD);
  const mongoAuthSource = process.env.MONGO_AUTH_SOURCE || "admin";
  
  const MONGO_URI = isDev ?
    `mongodb://${serverIp}:27017/${mongoDbName}` :
    `mongodb://${mongoUsername}:${mongoPassword}@${serverIp}:27017/${mongoDbName}?authSource=${mongoAuthSource}`;
    // "mongodb://derivix%40xts:derivix%40xts@13.126.47.249:27017/?authSource=admin";

  // if(isDev){
  //   MONGO_URI = `mongodb://localhost:27017/${mongoDbName}`;
  // }

  // MONGO_URI = `mongodb://${mongoUsername}:${mongoPassword}@${serverIp}:27017/${mongoDbName}?authSource=${mongoAuthSource}`;
 

  const options = {   
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
  };

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI, options);
      isConnected = mongoose.connection.readyState === 1;
      console.log("Connected to MongoDB:", isConnected);
    }

    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err.message);
    });

    mongoose.connection.on("disconnected", async () => {
      console.warn("Mongoose connection lost. Attempting to reconnect...");
      try {
        await mongoose.connect(MONGO_URI, options);
        console.log("Reconnected to MongoDB");
      } catch (err) {
        console.error("Failed to reconnect to MongoDB:", err.message);
      }
    });
  } catch (error) {
    console.error("Error connecting to database:", error.message);
    throw error;
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error disconnecting from database:", error.message);
    throw error;
  }
}