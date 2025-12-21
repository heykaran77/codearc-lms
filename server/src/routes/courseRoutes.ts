import express from "express";
import {
  getAllCourses,
  getCourseById,
  createCourse,
  getCourseContent,
  enrollCourse,
  unenrollCourse,
  addChapter,
  updateChapter,
  deleteChapter,
  deleteCourse,
  assignCourseToStudent,
  getMentorStats,
} from "../controllers/courseController";
import { protect, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

router.get(
  "/mentor/stats",
  protect,
  authorize("mentor", "admin"),
  getMentorStats
); // Specific route before :id

router.get("/", protect, getAllCourses); // Protected to check role
router.get("/:id", protect, getCourseById);
router.delete("/:id", protect, authorize("mentor", "admin"), deleteCourse);
router.get(
  "/:id/content",
  protect,
  authorize("student", "mentor", "admin"),
  getCourseContent
);

router.post("/:id/enroll", protect, authorize("student"), enrollCourse);
router.delete("/:id/enroll", protect, authorize("student"), unenrollCourse);

router.post("/", protect, authorize("mentor", "admin"), createCourse);
router.post(
  "/:courseId/chapters",
  protect,
  authorize("mentor", "admin"),
  addChapter
);
router.put(
  "/chapters/:id",
  protect,
  authorize("mentor", "admin"),
  updateChapter
);
router.delete(
  "/chapters/:id",
  protect,
  authorize("mentor", "admin"),
  deleteChapter
);
router.post(
  "/assign",
  protect,
  authorize("mentor", "admin"),
  assignCourseToStudent
);

export default router;
