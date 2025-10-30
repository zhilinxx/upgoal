import { Router } from "express";
import { getDashboard } from "../controllers/budgetController.js";
import {
  listGoalsCtrl, createGoalCtrl, updateGoalCtrl, deleteGoalCtrl,
} from "../controllers/goalsController.js";

const router = Router();

router.get("/dashboard", getDashboard);

// goals
router.get("/goals", listGoalsCtrl);
router.post("/goals", createGoalCtrl);
router.put("/goals/:id", updateGoalCtrl);
router.delete("/goals/:id", deleteGoalCtrl);

export default router;
