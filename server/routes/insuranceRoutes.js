import express from "express";
import { getInsuranceRecommendations } from "../controllers/insuranceRecommendationsController.js";
import { getProviders } from "../controllers/insuranceRecommendationsController.js";
import { saveInsuranceProfile } from "../controllers/insuranceProfileController.js";
import { getInsuranceProfile } from "../controllers/insuranceProfileController.js";
import { getPlanById } from "../controllers/insuranceRecommendationsController.js";
import { getPlanScore } from "../controllers/insuranceRecommendationsController.js";

const router = express.Router();

router.get("/recommendations/:userId", getInsuranceRecommendations);
router.get("/planScore", getPlanScore); 
router.get("/providers", getProviders);
router.post("/save", saveInsuranceProfile);
router.get("/plan/:planId", getPlanById);
router.get("/:userId", getInsuranceProfile);

export default router;
