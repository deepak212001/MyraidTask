import Task from "../models/task.model.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";

import {
  createTaskSchema,
  updateTaskSchema,
  getTasksQuerySchema,
} from "../validators/task.validator.js";

const createTask = asyncHandler(async (req, res, next) => {
  console.log("req.body", req.body);
  const validatedData = createTaskSchema.parse(req.body);
  const {title, description, status} = validatedData;
  const task = await Task.create({
    title,
    description,
    status,
    owner: req.user._id,
  });
  const taskObj = task.toObject();

  res
    .status(201)
    .json(new ApiResponse(201, {task: taskObj}, "Task created successfully"));
});

const getTasks = asyncHandler(async (req, res, next) => {
  const validatedData = getTasksQuerySchema.parse(req.query);
  const {page, limit, status, search} = validatedData;
  const query = {owner: req.user._id};

  if (status) {
    query.status = status;
  }

  if (search && search.trim()) {
    query.title = {$regex: search.trim(), $options: "i"};
  }

  const skip = (page - 1) * limit;
  const [tasks, total] = await Promise.all([
    Task.find(query).sort({createdAt: -1}).skip(skip).limit(limit).lean(),
    Task.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Tasks fetched successfully"
    )
  );
});

const getTaskById = asyncHandler(async (req, res, next) => {
  const task = req.task.toObject();
  res
    .status(200)
    .json(new ApiResponse(200, {task}, "Task fetched successfully"));
});

const updateTask = asyncHandler(async (req, res, next) => {
  const validatedData = updateTaskSchema.parse(req.body);
  const {title, description, status} = validatedData;
  const task = req.task;

  if (title !== undefined) task.title = title;
  if (status !== undefined) task.status = status;
  if (description !== undefined) task.description = description;

  await task.save();
  const taskObj = task.toObject();

  res
    .status(200)
    .json(new ApiResponse(200, {task: taskObj}, "Task updated successfully"));
});

const deleteTask = asyncHandler(async (req, res, next) => {
  await Task.findByIdAndDelete(req.params.id);
  res.status(200).json(new ApiResponse(200, {}, "Task deleted successfully"));
});

export {createTask, getTasks, getTaskById, updateTask, deleteTask};
