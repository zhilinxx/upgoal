// routes/accountRoutes.js
import express from "express";
import { getAllUsers, updateUserStatus } from "../controllers/accountController.js";
import { verifyToken } from "../middlewares/verifyToken.js"; // only verifyToken needed for now

const router = express.Router();

router.get("/", verifyToken, getAllUsers);
router.put("/status", verifyToken, updateUserStatus);

export default router;
