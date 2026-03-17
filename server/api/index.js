import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import connectDB from "./utils/connectDB.js";
import { app } from "./app.js";

app.get("/", (req, res) => {
  res.json("Task Management API - Server is running!" );
});

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.error("ERR:", error);
      throw error;
    });
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`⚙️  Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });
