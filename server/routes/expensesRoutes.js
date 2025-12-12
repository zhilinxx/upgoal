import { Router } from "express";
import {
  readMonthlyExpenses,
  createExpense,
  updateExpense,
  removeExpense,
} from "../controllers/expensesController.js";

const r = Router();

r.post("/", createExpense);

r.put("/:expenseId", updateExpense);

r.get("/", readMonthlyExpenses);

r.delete("/:expenseId", removeExpense);

export default r;
