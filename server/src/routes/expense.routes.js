import { Router } from "express";
import {
  addExpense,
  getExpenses,
  getBalances,
  deleteExpense,
} from "../controllers/expense.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply auth middleware to all routes
router.use(verifyJWT);

// Root routes are prefixed with /api/v1/expenses in app.js
router.route("/:tripId").post(addExpense).get(getExpenses);
router.route("/:tripId/balances").get(getBalances);
router.route("/:tripId/:expenseId").delete(deleteExpense);

export default router;
