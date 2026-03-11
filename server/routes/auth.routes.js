import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPasswordRequest,
  refreshAccessToken,
  resetForgotPassword,
  changeCurrentPassword,
  resendPhoneOTP,
  addMoneyToUserWallet,
} from "../../controllers/auth.controllers.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { verifyPhoneOTP } from "../../controllers/auth.controllers.js";

const router = Router();

// Below line of code means that when a POST request is made to "/register", the registerUser controller function will be called.
// Unsecure Routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/verify-email/:verificationToken").get(verifyEmail);
router.route("/refresh-token").get(refreshAccessToken);
router.route("/forgot-password").post(forgotPasswordRequest);
router.route("/reset-password/:resetToken").post(resetForgotPassword);


// Secure Routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router
  .route("/resend-verification-email")
  .post(verifyJWT, resendVerificationEmail);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/add-money").post(verifyJWT, addMoneyToUserWallet);

export default router;
