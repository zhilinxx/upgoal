import { Router } from "express";
import {
  readMonthlyExpenses,
  createExpense,
  updateExpense,
  removeExpense,
} from "../controllers/expensesController.js";

const r = Router();

// Create
r.post("/", createExpense);

// Edit
r.put("/:expenseId", updateExpense);

// Read (paged)
r.get("/", readMonthlyExpenses);

// Delete
r.delete("/:expenseId", removeExpense);

export default r;
