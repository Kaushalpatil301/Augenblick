import mongoose from "mongoose";

const expenseParticipantSchema = new mongoose.Schema(
  {
    participant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const splitDetailSchema = new mongoose.Schema(
  {
    participant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const expenseSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paid_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: {
      type: [expenseParticipantSchema],
      required: true,
    },
    split_details: {
      type: [splitDetailSchema], // How much each person owes
      required: true,
    },
    split_type: {
      type: String,
      enum: ["equal", "custom", "percentage"],
      default: "equal",
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export const Expense = mongoose.model("Expense", expenseSchema);
