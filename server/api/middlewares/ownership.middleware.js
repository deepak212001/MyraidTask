import Task from "../models/task.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const checkTaskOwnership = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return next(new ApiError(404, "Task not found"));
  }
  if (task.owner.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, "Access denied - You can only modify your own tasks"));
  }
  req.task = task;
  next();
});
