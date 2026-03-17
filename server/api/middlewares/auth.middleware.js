import jwt from "jsonwebtoken";
import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import User from "../models/user.model.js";

const authMiddleware = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    console.log(token);
    if (!token) {
      return next(new ApiError(401, "Unauthorized"));
    }
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    const user = await User.findById(decoded._id).select("-password");
    if (!user) {
      return next(new ApiError(401, "Unauthorized"));
    }
    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(401, "Unauthorized"));
  }
});

export default authMiddleware;
