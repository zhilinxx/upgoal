import { Router } from "express";
import { getDashboard } from "../controllers/budgetController.js";

const router = Router();
router.get("/dashboard", getDashboard);
export default router;
