import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {checkTaskOwnership} from "../middlewares/ownership.middleware.js";

import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createTask);
router.get("/", getTasks);
router.get("/:id", checkTaskOwnership, getTaskById);
router.patch(
  "/:id",
  checkTaskOwnership,
  updateTask
);
router.delete("/:id", checkTaskOwnership, deleteTask);

export default router;
