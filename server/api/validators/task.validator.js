import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().default(""),
  status: z.enum(["pending", "in_progress", "completed"]).optional().default("pending"),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
});

export const getTasksQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  search: z.string().max(100).optional(),
});
