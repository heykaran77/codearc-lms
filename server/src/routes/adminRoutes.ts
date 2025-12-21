import express from "express";
import {
  getPlatformStats,
  getAllUsers,
  toggleUserApproval,
  deleteUser,
} from "../controllers/adminController";
import { protect, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

// All routes here are admin only
router.use(protect);
router.use(authorize("admin"));

router.get("/stats", getPlatformStats);
router.get("/users", getAllUsers);
router.patch("/users/:id/approval", toggleUserApproval);
router.delete("/users/:id", deleteUser);

export default router;
