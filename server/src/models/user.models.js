import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new Schema(
  {
    avatar: {
      type: {
        url: String,
        localPath: String,
      },
      default: {
        url: `https://placehold.co/100x100`,
        localPath: "",
      },
    },

    username: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

   

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },



    refreshToken: String,
    forgotPasswordToken: String,
    forgotPasswordExpiry: Date,
    emailVerificationToken: String,
    emailVerificationExpiry: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateTemporaryForgotPasswordToken = function () {
  const forgotToken = crypto.randomBytes(20).toString("hex");

  const forgotPasswordToken = crypto
    .createHash("sha256")
    .update(forgotToken)
    .digest("hex");

  const forgotPasswordExpiry = Date.now() + 20 * 60 * 1000;

  return { forgotToken, forgotPasswordToken, forgotPasswordExpiry };
};

export const User = mongoose.model("User", userSchema);
