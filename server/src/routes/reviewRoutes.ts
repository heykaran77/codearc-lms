import express from "express";
import {
  createReview,
  getMyCourseReviews,
  getMentorPendingReviews,
  updateReviewStatus,
} from "../controllers/reviewController";
import { protect } from "../middlewares/authMiddleware";

const router = express.Router();

router.use(protect);

router.post("/", createReview);
router.get("/mentor", getMentorPendingReviews);
router.get("/:courseId", getMyCourseReviews);
router.put("/:id", updateReviewStatus);

export default router;
