import { Request, Response } from "express";
import { db } from "../db";
import { notifications, users } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";

// --- Helper Functions ---

export const createNotification = async (
  userId: number,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info"
) => {
  try {
    await db.insert(notifications).values({
      userId,
      title,
      message,
      type,
      isRead: false,
    });
  } catch (error) {
    console.error("Failed to create notification", error);
  }
};

export const notifyRole = async (
  role: "student" | "mentor" | "admin",
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info"
) => {
  try {
    const targets = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, role));

    if (targets.length === 0) return;

    // Batch insert?
    const values = targets.map((user) => ({
      userId: user.id,
      title,
      message,
      type,
      isRead: false,
    }));

    await db.insert(notifications).values(values);
  } catch (error) {
    console.error(`Failed to notify role ${role}`, error);
  }
};

// --- Controllers ---

export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    res.json(userNotifications);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.id, Number(id)), eq(notifications.userId, userId))
      );

    res.json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification" });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));

    res.json({ message: "All marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notifications" });
  }
};
