import express from "express";
import {
  completeChapter,
  getProgress,
  downloadCertificate,
  getDashboardStats,
} from "../controllers/progressController";
import { protect, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

router.use(protect);

router.get("/stats", authorize("student"), getDashboardStats);
router.post("/:chapterId/complete", authorize("student"), completeChapter);
router.get("/my", authorize("student"), getProgress);
router.get("/certificate/:courseId", authorize("student"), downloadCertificate);

export default router;
