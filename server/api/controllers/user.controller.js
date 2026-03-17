import User from "../models/user.model.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {registerSchema, loginSchema} from "../validators/auth.validator.js";

const registerUser = asyncHandler(async (req, res, next) => {
  const validatedData = registerSchema.parse(req.body);
  const {name, email, password} = validatedData;
  console.log(validatedData);
  const existingUser = await User.findOne({email});
  if (existingUser) {
    return next(new ApiError(400, "User already exists"));
  }
  const user = await User.create({name, email, password});
  const token = user.generateToken();
  const userResponse = user.toObject();
  delete userResponse.password;

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 30,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res
    .status(201)
    .json(
      new ApiResponse(201, {user: userResponse}, "User registered successfully")
    );
});

const loginUser = asyncHandler(async (req, res, next) => {
  const {email, password} = loginSchema.parse(req.body);

  const user = await User.findOne({email});
  if (!user) {
    return next(new ApiError(401, "Invalid credentials"));
  }
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    return next(new ApiError(401, "Invalid credentials"));
  }
  const token = user.generateToken();
  const userResponse = user.toObject();
  delete userResponse.password;

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 30,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res
    .status(200)
    .json(
      new ApiResponse(200, {user: userResponse}, "User logged in successfully")
    );
});

const logoutUser = asyncHandler(async (req, res, next) => {
  res.clearCookie("token");
  res
    .status(200)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const getMe = asyncHandler(async (req, res, next) => {
  const user = req.user.toObject();
  delete user.password;
  res
    .status(200)
    .json(new ApiResponse(200, {user}, "User fetched successfully"));
});

export {registerUser, loginUser, logoutUser, getMe};
