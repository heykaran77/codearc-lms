import express from "express";
import { protect } from "../middlewares/authMiddleware";
import {
  sendMessage,
  getChatHistory,
  getContacts,
} from "../controllers/chatController";

const router = express.Router();

router.use(protect); // All chat routes require auth

router.post("/send", sendMessage);
router.get("/history/:userId", getChatHistory);
router.get("/contacts", getContacts);

export default router;
