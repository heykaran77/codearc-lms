import { Request, Response } from "express";
import { db } from "../db";
import { users, messages } from "../db/schema";
import { eq, or, and, desc, ne, sql, gt } from "drizzle-orm";

import { createNotification } from "./notificationController";

// 48 hours in milliseconds
const EXPIRATION_TIME = 48 * 60 * 60 * 1000;

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user?.id;

    if (!senderId) return res.status(401).json({ message: "Unauthorized" });

    // Validate receiver exists
    const [receiver] = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(receiverId)));
    const [sender] = await db
      .select()
      .from(users)
      .where(eq(users.id, senderId));

    if (!receiver) return res.status(404).json({ message: "User not found" });

    // Insert Message
    const [message] = await db
      .insert(messages)
      .values({
        senderId,
        receiverId: Number(receiverId),
        content,
      })
      .returning();

    // Create System Notification
    await createNotification(
      Number(receiverId),
      "New Message",
      `You have a new message from ${sender?.name || "someone"}.`,
      "info"
    );

    res.status(201).json(message);
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params; // The other person
    const myId = req.user?.id;

    if (!myId) return res.status(401).json({ message: "Unauthorized" });

    // Calculate expiration timestamp (Now - 48h)
    const cutoffDate = new Date(Date.now() - EXPIRATION_TIME);

    // 1. Mark incoming messages as read
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.senderId, Number(userId)),
          eq(messages.receiverId, myId),
          eq(messages.isRead, false)
        )
      );

    // 2. Fetch history
    const chatHistory = await db
      .select()
      .from(messages)
      .where(
        and(
          or(
            and(
              eq(messages.senderId, myId),
              eq(messages.receiverId, Number(userId))
            ),
            and(
              eq(messages.senderId, Number(userId)),
              eq(messages.receiverId, myId)
            )
          ),
          gt(messages.createdAt, cutoffDate) // Only older than 48h
        )
      )
      .orderBy(desc(messages.createdAt));

    res.json(chatHistory);
  } catch (error) {
    console.error("Get Chat Error:", error);
    res.status(500).json({ message: "Failed to get chat history" });
  }
};

export const getContacts = async (req: Request, res: Response) => {
  try {
    const myId = req.user?.id;
    const myRole = req.user?.role;

    if (!myId) return res.status(401).json({ message: "Unauthorized" });

    let usersQuery;

    // Logic: Same as before
    if (myRole === "student") {
      usersQuery = db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
        })
        .from(users)
        .where(or(eq(users.role, "mentor"), eq(users.role, "admin")));
    } else if (myRole === "mentor") {
      usersQuery = db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
        })
        .from(users)
        .where(or(eq(users.role, "student"), eq(users.role, "admin")));
    } else {
      // Admin
      usersQuery = db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
        })
        .from(users)
        .where(ne(users.id, myId));
    }

    const contactsList = await usersQuery;

    // Calculate unread count for each contact
    // (Optimization: use a single group by query, but simple loop is strictly safer for now with complex logic)
    // Actually, let's do Promise.all
    const contactsWithUnread = await Promise.all(
      contactsList.map(async (contact) => {
        const unreadCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.senderId, contact.id),
              eq(messages.receiverId, myId),
              eq(messages.isRead, false)
            )
          );
        return {
          ...contact,
          unreadCount: Number(unreadCountResult[0].count),
        };
      })
    );

    res.json(contactsWithUnread);
  } catch (error) {
    console.error("Get Contacts Error:", error);
    res.status(500).json({ message: "Failed to get contacts" });
  }
};
