import express from "express";
import { getTheme, updateTheme } from "../controllers/themeController.js";

// If you have auth middleware, include it here:
// import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", /*requireAuth,*/ getTheme);
router.put("/", /*requireAuth,*/ updateTheme);

export default router;
