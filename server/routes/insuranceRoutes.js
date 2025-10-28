import express from "express";
import { getInsuranceRecommendations } from "../controllers/insuranceRecommendationsController.js";
import { getProviders } from "../controllers/insuranceRecommendationsController.js";
import { saveInsuranceProfile } from "../controllers/insuranceProfileController.js";
import { getInsuranceProfile } from "../controllers/insuranceProfileController.js";

const router = express.Router();

router.get("/recommendations/:userId", getInsuranceRecommendations);
router.get("/providers", getProviders);
router.post("/save", saveInsuranceProfile);
router.get("/:userId", getInsuranceProfile);

export default router;
