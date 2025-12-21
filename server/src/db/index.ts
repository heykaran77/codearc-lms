import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Supabase
});

const connectDB = async () => {
  try {
    await client.connect();
    console.log("Connected to database");
  } catch (error) {
    console.error("Database connection failed", error);
  }
};

// Prevent app crash on unexpected db errors
client.on("error", (err) => {
  console.error("Unexpected database error:", err);
  // Don't exit process immediately, let it try to recover or just log
});

connectDB();

export const db = drizzle(client, { schema });
