import { Request, Response } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { generateToken } from "../utils/jwt";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["student", "mentor"]), // Admin should be seeded or special creation
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = registerSchema.parse(req.body);

    // Check availability
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Mentors need approval
    const isApproved = role === "student";

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        role,
        isApproved,
      })
      .returning();

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      token: generateToken({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      }),
      message:
        role === "mentor"
          ? "Mentor account created, strictly needs admin approval."
          : "Student registered successfully.",
    });
  } catch (error: any) {
    res.status(400).json({ message: error.errors || error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.role === "mentor" && !user.isApproved) {
      return res
        .status(403)
        .json({ message: "Mentor account not approved by Admin yet." });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken({ id: user.id, email: user.email, role: user.role }),
    });
  } catch (error: any) {
    res.status(400).json({ message: error.errors || error.message });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
      return res.status(400).json({ message: "Invalid old password" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    res.json({ message: "Password updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
