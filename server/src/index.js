import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./db/index.js";
import { createServer } from "http";

const port = process.env.PORT || 3000;

const httpServer = createServer(app);

connectDB()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(`🚀 Server is running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  });
