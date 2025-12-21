import { Request, Response } from "express";
import { db } from "../db";
import { users, courses, courseAssignments, progress } from "../db/schema";
import { eq, sql, count, and } from "drizzle-orm";

export const getPlatformStats = async (req: Request, res: Response) => {
  try {
    // 1. Total Users by Role
    const userStats = await db
      .select({
        role: users.role,
        count: count(users.id),
      })
      .from(users)
      .groupBy(users.role);

    // 2. Total Courses
    const courseCount = await db
      .select({ count: count(courses.id) })
      .from(courses);

    // 3. Total Enrollments
    const enrollmentCount = await db
      .select({ count: count(courseAssignments.id) })
      .from(courseAssignments);

    // 4. Total Completions (100% progress for a course/student combo)
    // This is a bit complex in Drizzle without subqueries/CTE helper easily shown,
    // but we can estimate or count progress records where isCompleted is true
    // and chapters match total chapters. For simple dashboard, let's just count total completed chapters as a proxy
    // or do a raw SQL count for "fully completed courses".

    // Simple completion count: total students who finished at least one course
    const completionCountResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM (
        SELECT student_id, course_id 
        FROM progress p
        JOIN chapters c ON p.chapter_id = c.id
        WHERE p.is_completed = true
        GROUP BY student_id, course_id
        HAVING COUNT(p.id) = (SELECT COUNT(*) FROM chapters WHERE course_id = c.course_id)
      ) as completed_courses
    `);

    const completions = (completionCountResult.rows[0] as any)?.count || 0;

    res.json({
      users: userStats,
      totalCourses: courseCount[0].count,
      totalEnrollments: enrollmentCount[0].count,
      totalCompletions: Number(completions),
    });
  } catch (error) {
    console.error("Get Platform Stats Error:", error);
    res.status(500).json({ message: "Failed to fetch platform stats" });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isApproved: users.isApproved,
        createdAt: users.createdAt,
      })
      .from(users);

    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const toggleUserApproval = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    await db
      .update(users)
      .set({ isApproved })
      .where(eq(users.id, Number(id)));

    res.json({
      message: `User ${isApproved ? "approved" : "unapproved"} successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user status" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Optional: add checks to prevent admin from deleting self
    if (req.user?.id === Number(id)) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    await db.delete(users).where(eq(users.id, Number(id)));
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" });
  }
};
