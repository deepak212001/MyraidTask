import User from "../models/user.model.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {registerSchema, loginSchema} from "../validators/auth.validator.js";
import {encryptJsonWithAesKey, hybridDecryptWithKey} from "../aes.js";

function sendEncryptedWithRequestKeyOr400(req, res, status, payload, aesKey) {
  try {
    const requestIv = req?.body?.iv;
    const encrypted = encryptJsonWithAesKey(payload, aesKey, requestIv);
    // Echo back the request's RSA-encrypted AES key so clients can correlate
    // a response to the request that generated the AES key.
    const requestEncryptedAESKey = req?.body?.encryptedAESKey;
    return res.status(status).json({
      encrypted: true,
      ...(requestEncryptedAESKey
        ? {encryptedAESKey: requestEncryptedAESKey}
        : {}),
      ...encrypted,
    });
  } catch (e) {
    return res.status(400).json({
      message: "Failed to encrypt response with request AES key",
      error: e?.message,
    });
  }
}

const registerUser = asyncHandler(async (req, res, next) => {
  const {data, aesKey} = hybridDecryptWithKey(req.body);
  console.log("data", data);
  const validatedData = registerSchema.parse(data);
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
  const responseData = {
    user: userResponse,
    message: "User registered successfully",
  };
  console.log("responseData", responseData);
  return sendEncryptedWithRequestKeyOr400(req, res, 201, responseData, aesKey);
});

const loginUser = asyncHandler(async (req, res, next) => {
  const {data, aesKey} = hybridDecryptWithKey(req.body);
  const {email, password} = loginSchema.parse(data);

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

  const responseData = {
    user: userResponse,
    message: "User logged in successfully",
  };
  return sendEncryptedWithRequestKeyOr400(req, res, 200, responseData, aesKey);
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
