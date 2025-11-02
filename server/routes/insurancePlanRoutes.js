import express from "express";
import {
  getAllPlans,
  getPlanById,
  addPlan,
  updatePlan,
  deletePlans,
  upload
} from "../controllers/insurancePlanController.js";

const router = express.Router();

router.get("/", getAllPlans);
router.get("/:id", getPlanById);
router.post("/", upload.fields([{ name: "logo" }, { name: "brochure" }]), addPlan);
router.put("/:id", upload.fields([{ name: "logo" }, { name: "brochure" }]), updatePlan);
router.delete("/", deletePlans);

export default router;
