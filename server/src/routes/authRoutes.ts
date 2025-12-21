import express from "express";
import {
  registerUser,
  loginUser,
  changePassword,
} from "../controllers/authController";
import { protect } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/change-password", protect, changePassword);

export default router;
