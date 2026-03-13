import { Expense } from "../models/expense.models.js";
import { Trip } from "../models/trip.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// Helper function to simplify debts
const simplifyDebts = (balances) => {
  const debtors = [];
  const creditors = [];

  // Separate into debtors (negative balance) and creditors (positive balance)
  for (const [userId, { amount, name }] of Object.entries(balances)) {
    if (amount < -0.01)
      debtors.push({ userId, amount, name }); // They owe
    else if (amount > 0.01) creditors.push({ userId, amount, name }); // They are owed
  }

  // Sort by amount to resolve biggest debts first (greedy approach)
  debtors.sort((a, b) => a.amount - b.amount); // Most negative first
  creditors.sort((a, b) => b.amount - a.amount); // Most positive first

  const transactions = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    // The amount to settle is the minimum of what debtor owes and what creditor is owed
    const settlementAmount = Math.min(-debtor.amount, creditor.amount);

    transactions.push({
      from: debtor.userId,
      fromName: debtor.name,
      to: creditor.userId,
      toName: creditor.name,
      amount: Number(settlementAmount.toFixed(2)),
    });

    // Adjust balances
    debtor.amount += settlementAmount;
    creditor.amount -= settlementAmount;

    // Move to next if fully settled (using small epsilon for floating point issues)
    if (Math.abs(debtor.amount) < 0.01) d++;
    if (Math.abs(creditor.amount) < 0.01) c++;
  }

  return transactions;
};

export const addExpense = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const {
    description,
    amount,
    paid_by,
    participants,
    split_details,
    split_type,
  } = req.body;

  if (!description || !amount || !paid_by || !participants || !split_details) {
    throw new ApiError(400, "All expense fields are required");
  }

  // Verify trip exists
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  // Validate split details sum up to total amount
  const totalSplit = split_details.reduce(
    (sum, detail) => sum + Number(detail.amount),
    0,
  );
  if (Math.abs(totalSplit - amount) > 0.1) {
    // 10 cents tolerance for rounding
    throw new ApiError(400, "Split amounts must sum up to the total amount");
  }

  const expense = await Expense.create({
    tripId: new mongoose.Types.ObjectId(tripId),
    description,
    amount: Number(amount),
    paid_by: new mongoose.Types.ObjectId(paid_by),
    participants,
    split_details,
    split_type: split_type || "equal",
  });

  return res
    .status(201)
    .json(new ApiResponse(201, expense, "Expense added successfully"));
});

export const getExpenses = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const expenses = await Expense.find({
    tripId: new mongoose.Types.ObjectId(tripId),
  })
    .sort({ createdAt: -1 })
    .populate("paid_by", "username email"); // Assuming user model has username

  return res
    .status(200)
    .json(new ApiResponse(200, expenses, "Expenses retrieved successfully"));
});

export const getBalances = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const expenses = await Expense.find({
    tripId: new mongoose.Types.ObjectId(tripId),
  }).populate("paid_by", "name username");

  // Calculate net balances
  const balances = {}; // { userId: { amount: 0, name: 'Alice' } }

  expenses.forEach((expense) => {
    const paidByStr = expense.paid_by._id.toString();
    const paidByName =
      expense.paid_by.username || expense.paid_by.name || "Unknown";

    // Add to paid_by's balance (they are owed this money)
    if (!balances[paidByStr])
      balances[paidByStr] = { amount: 0, name: paidByName };
    balances[paidByStr].amount += expense.amount;

    // Subtract from each participant's balance (they owe this money)
    expense.split_details.forEach((split) => {
      const participantIdStr = split.participant_id.toString();

      // Get participant name from the embedded array
      const participantInfo = expense.participants.find(
        (p) => p.participant_id.toString() === participantIdStr,
      );
      const participantName = participantInfo
        ? participantInfo.name
        : "Unknown";

      if (!balances[participantIdStr]) {
        balances[participantIdStr] = { amount: 0, name: participantName };
      }
      balances[participantIdStr].amount -= split.amount;
    });
  });

  // Calculate who owes who
  const transactions = simplifyDebts(balances);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { balances, transactions },
        "Balances calculated successfully",
      ),
    );
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const { tripId, expenseId } = req.params;

  const expense = await Expense.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(expenseId),
    tripId: new mongoose.Types.ObjectId(tripId),
  });

  if (!expense) {
    throw new ApiError(404, "Expense not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Expense deleted successfully"));
});
