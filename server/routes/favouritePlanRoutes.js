import express from "express";
import {
  getFavourites,
  addFavourite,
  removeFavourite,
  checkFavourite,
  removeMultipleFavourites
} from "../controllers/favouritePlanController.js";

const router = express.Router();

router.get("/:userId", getFavourites);
router.get("/check/:userId/:planId", checkFavourite);
router.post("/add", addFavourite);
router.post("/remove", removeFavourite);
router.post("/removeMultiple", removeMultipleFavourites);

export default router;
