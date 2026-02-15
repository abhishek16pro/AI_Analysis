import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

let isConnected = false;

export async function connectDB() {

    if (isConnected) {
        console.log("MongoDB already connected");
        return;
    }

    try {

        const MONGODB_URI = process.env.MONGODB_URI;
        console.log("Attempting to connect to MongoDB with URI:", MONGODB_URI);


        const conn = await mongoose.connect(MONGODB_URI, {
            dbName: process.env.MONGODB_NAME || "AI_Analysis",
            // recommended options
            maxPoolSize: 20,
            minPoolSize: 5,

            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        isConnected = true;

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // connection events
        mongoose.connection.on("connected", () => {
            console.log("Mongoose connected");
        });

        mongoose.connection.on("error", (err) => {
            console.error("Mongoose error:", err);
        });

        mongoose.connection.on("disconnected", () => {
            console.warn("Mongoose disconnected");
            isConnected = false;
        });

    } catch (error) {

        console.error("MongoDB connection failed:", error.message);

        process.exit(1);
    }
}

export async function disconnectDB() {
    try {
        if (!isConnected) return;
        await mongoose.connection.close();
        isConnected = false;
        console.log("MongoDB disconnected successfully");
    } catch (error) {
        console.error("Error disconnecting MongoDB:", error.message);
    }
}