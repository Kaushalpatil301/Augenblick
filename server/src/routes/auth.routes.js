import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  forgotPasswordRequest,
  refreshAccessToken,
  resetForgotPassword,
  changeCurrentPassword,
} from "../controllers/auth.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Below line of code means that when a POST request is made to "/register", the registerUser controller function will be called.
// Unsecure Routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").get(refreshAccessToken);
router.route("/forgot-password").post(forgotPasswordRequest);
router.route("/reset-password/:resetToken").post(resetForgotPassword);

// Secure Routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);

export default router;
