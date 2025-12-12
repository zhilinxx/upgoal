import express from "express";
import { getTheme, updateTheme } from "../controllers/themeController.js";

const router = express.Router();

router.get("/", /*requireAuth,*/ getTheme);
router.put("/", /*requireAuth,*/ updateTheme);

export default router;
