import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import errorHandler from "./middlewares/errorHandler.middleware.js";
import userRouter from "./routers/user.route.js";
import taskRouter from "./routers/task.route.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "https://myraid-task-rqz5.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
);

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(cookieParser());

// Note: express-mongo-sanitize removed - incompatible with Express 5 (req.query is read-only).
// Zod validation + controlled query structure provides sufficient protection.

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});
app.use("/api/", limiter);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/tasks", taskRouter);

app.use(errorHandler);

export {app};
