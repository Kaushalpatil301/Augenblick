import express from "express";
import cors from "cors";
// Import Routes
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";

const app = express();

// CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  }),
);

// Basic Configurations
app.use(express.json({ limit: "16kb" })); // Accept json data
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // Accept parameters from the url
app.use(express.static("public")); // Use "public" folder
app.use(cookieParser()); // Parse cookies

app.use("/api/v1/auth", authRouter);

app.get("/", (req, res) => {
  res.send("Welcome to my Project");
});

export default app;
