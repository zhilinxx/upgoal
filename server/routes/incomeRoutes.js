import { Router } from "express";
import { createIncome, updateIncome, readIncomeSetup } from "../controllers/incomeController.js";

const r = Router();

// Create
r.post("/", createIncome);

// Edit latest OR specific id
r.put("/", updateIncome);               // Edit latest
r.put("/:incomeId", updateIncome);      // Edit by ID


// Read combined income + commitments (UI friendly)
// GET /api/income/setup?userId=1  OR  /api/income/setup/1
r.get("/setup", readIncomeSetup); 

export default r;
