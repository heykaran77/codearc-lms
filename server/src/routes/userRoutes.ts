import express from "express";
import { getUserProfile, getStudents } from "../controllers/userController";
import { protect } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/profile", protect, getUserProfile);
router.get("/students", protect, getStudents);

export default router;
