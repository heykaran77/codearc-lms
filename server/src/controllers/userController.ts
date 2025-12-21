import { Request, Response } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export const getUserProfile = async (req: Request, res: Response) => {
  res.json({ message: "Get user profile" });
};

export const getStudents = async (req: Request, res: Response) => {
  try {
    const courseId = req.query.courseId;

    // Only mentors/admins should see this
    if (req.user?.role === "student") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const students = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "student"));

    if (courseId) {
      // Check enrollment for this specific course
      // Import needed lazily or just use db if tables are imported or direct SQL
      // Better to import tables at top
      const { courseAssignments } = await import("../db/schema");
      const { and } = await import("drizzle-orm");

      const enrolledStudents = await db
        .select({ studentId: courseAssignments.studentId })
        .from(courseAssignments)
        .where(eq(courseAssignments.courseId, Number(courseId)));

      const enrolledIds = enrolledStudents.map((e) => e.studentId);

      const studentsWithStatus = students.map((s) => ({
        ...s,
        isEnrolled: enrolledIds.includes(s.id),
      }));

      return res.json(studentsWithStatus);
    }

    res.json(students);
  } catch (error) {
    console.error("Get Students Error:", error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};
