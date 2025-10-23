// routes/profileRoutes.js
import express from "express";
import { getUserProfile, updateInsuranceProfile } from "../controllers/profileController.js";
import { verifyToken } from "../middlewares/verifyToken.js"; // assuming same pattern as auth

const router = express.Router();

// Protected routes
router.get("/me", verifyToken, getUserProfile);
router.put("/insurance", verifyToken, updateInsuranceProfile);

export default router;
