import { Request, Response } from "express";
import { db } from "../db";
import {
  courses,
  courseAssignments,
  chapters,
  progress,
  users,
} from "../db/schema";
import { eq, and, asc, sql, inArray } from "drizzle-orm";
import { notifyRole, createNotification } from "./notificationController";
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const allCourses = await db.select().from(courses);

    if (role === "student") {
      // Get user's assignments
      const assignments = await db
        .select()
        .from(courseAssignments)
        .where(eq(courseAssignments.studentId, userId));

      const enrolledCourseIds = assignments.map((a) => a.courseId);

      // Calculate completion status for enrolled courses
      const userProgress = await db
        .select()
        .from(progress)
        .where(eq(progress.studentId, userId));

      const allChapters = await db
        .select({ id: chapters.id, courseId: chapters.courseId })
        .from(chapters);

      const coursesWithStatus = allCourses.map((course) => {
        const isEnrolled = enrolledCourseIds.includes(course.id);
        let isCompleted = false;

        if (isEnrolled) {
          const courseChapterIds = allChapters
            .filter((c) => c.courseId === course.id)
            .map((c) => c.id);
          const totalChapters = courseChapterIds.length;

          if (totalChapters > 0) {
            const completedCount = userProgress.filter(
              (p) => courseChapterIds.includes(p.chapterId) && p.isCompleted
            ).length;
            if (completedCount === totalChapters) {
              isCompleted = true;
            }
          }
        }

        return {
          ...course,
          isEnrolled,
          isCompleted,
        };
      });

      return res.json(coursesWithStatus);
    }

    if (role === "mentor") {
      const mentorCourses = allCourses.filter((c) => c.mentorId === userId);
      return res.json(mentorCourses);
    }

    res.json(allCourses);
  } catch (error) {
    console.error("Get All Courses Error:", error);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
};

export const enrollCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Check if already enrolled
    const existing = await db
      .select()
      .from(courseAssignments)
      .where(
        and(
          eq(courseAssignments.courseId, Number(id)),
          eq(courseAssignments.studentId, userId)
        )
      );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Already enrolled" });
    }

    // Get Course info for notification
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, Number(id)));

    // Get User info for notification
    const [student] = await db.select().from(users).where(eq(users.id, userId));

    await db.insert(courseAssignments).values({
      courseId: Number(id),
      studentId: userId,
      assignedAt: new Date(),
    });

    if (course && student) {
      await createNotification(
        course.mentorId,
        "New Enrollment",
        `${student.name} has enrolled in your course "${course.title}".`,
        "success"
      );
    }

    res.json({ message: "Enrolled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to enroll" });
  }
};

export const unenrollCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // 1. Unassign the user
    await db
      .delete(courseAssignments)
      .where(
        and(
          eq(courseAssignments.courseId, Number(id)),
          eq(courseAssignments.studentId, userId)
        )
      );

    // 2. Reset Progress (Delete progress records for chapters of this course)
    // First, get chapter IDs for this course
    const courseChapters = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.courseId, Number(id)));

    const chapterIds = courseChapters.map((c) => c.id);

    if (chapterIds.length > 0) {
      await db
        .delete(progress)
        .where(
          and(
            eq(progress.studentId, userId),
            inArray(progress.chapterId, chapterIds)
          )
        );
    }

    res.json({ message: "Unenrolled and progress reset successfully" });
  } catch (error) {
    console.error("Unenroll Error:", error);
    res.status(500).json({ message: "Failed to unenroll" });
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await db
      .select()
      .from(courses)
      .where(eq(courses.id, Number(id)))
      .limit(1);

    if (course.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(course[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch course" });
  }
};

export const getCourseContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // courseId
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Verify assignment if student
    if (req.user?.role === "student") {
      const assignment = await db
        .select()
        .from(courseAssignments)
        .where(
          and(
            eq(courseAssignments.courseId, Number(id)),
            eq(courseAssignments.studentId, userId)
          )
        );

      if (assignment.length === 0) {
        return res
          .status(403)
          .json({ message: "You are not enrolled in this course" });
      }
    }

    // Get Chapters
    const courseChapters = await db
      .select()
      .from(chapters)
      .where(eq(chapters.courseId, Number(id)))
      .orderBy(asc(chapters.sequence));

    // Get Progress
    const userProgress = await db
      .select()
      .from(progress)
      .where(eq(progress.studentId, userId));

    const completedChapterIds = userProgress
      .filter((p) => p.isCompleted)
      .map((p) => p.chapterId);

    // Determine Lock Status
    const chaptersWithStatus = courseChapters.map((chapter, index) => {
      const isCompleted = completedChapterIds.includes(chapter.id);
      let isLocked = false;

      // Students must follow sequence
      if (req.user?.role === "student") {
        if (index > 0) {
          const prevChapter = courseChapters[index - 1];
          const isPrevCompleted = completedChapterIds.includes(prevChapter.id);
          if (!isPrevCompleted) {
            isLocked = true;
          }
        }
      }

      return {
        ...chapter,
        isCompleted,
        isLocked,
        videoUrl:
          req.user?.role === "student" && isLocked ? null : chapter.videoUrl,
      };
    });

    res.json(chaptersWithStatus);
  } catch (error: any) {
    console.error("Get Course Content Error:", error);
    res.status(500).json({ message: "Failed to fetch course content" });
  }
};

// --- MENTOR CONTROLLERS ---

export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const mentorId = req.user?.id;

    if (!mentorId) return res.status(401).json({ message: "Unauthorized" });

    // Get Mentor Name
    const [mentor] = await db
      .select()
      .from(users)
      .where(eq(users.id, mentorId));

    const [newCourse] = await db
      .insert(courses)
      .values({
        title,
        description,
        mentorId,
      })
      .returning();

    // Notifications
    const mentorName = mentor ? mentor.name : "A mentor";

    // User requested explicitly: "The shudent shoud get a notification"
    await notifyRole(
      "student",
      "New Course Available",
      `A new course "${title}" by ${mentorName} is now available to enroll.`,
      "info"
    );
    await notifyRole(
      "admin",
      "New Course Alert",
      `A new course "${title}" has been created by ${mentorName}.`,
      "info"
    );

    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ message: "Failed to create course" });
  }
};

export const addChapter = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, description, videoUrl, imageUrl, sequence } = req.body;
    const mentorId = req.user?.id;

    if (!mentorId) return res.status(401).json({ message: "Unauthorized" });

    // Verify ownership (Mentor can only add to their courses, or Admin)
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, Number(courseId)));

    if (!course) return res.status(404).json({ message: "Course not found" });

    if (req.user?.role === "mentor" && course.mentorId !== mentorId) {
      return res
        .status(403)
        .json({ message: "You can only edit your own courses" });
    }

    const [newChapter] = await db
      .insert(chapters)
      .values({
        courseId: Number(courseId),
        title,
        description,
        videoUrl,
        imageUrl,
        sequence,
      })
      .returning();

    res.status(201).json(newChapter);
  } catch (error) {
    res.status(500).json({ message: "Failed to add chapter" });
  }
};

export const updateChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // chapterId
    const { title, description, videoUrl, imageUrl, sequence } = req.body;
    const mentorId = req.user?.id;

    if (!mentorId) return res.status(401).json({ message: "Unauthorized" });

    // Verify ownership
    const [chapter] = await db
      .select()
      .from(chapters)
      .innerJoin(courses, eq(chapters.courseId, courses.id))
      .where(eq(chapters.id, Number(id)));

    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    if (req.user?.role === "mentor" && chapter.courses.mentorId !== mentorId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const [updated] = await db
      .update(chapters)
      .set({ title, description, videoUrl, imageUrl, sequence })
      .where(eq(chapters.id, Number(id)))
      .returning();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update chapter" });
  }
};

export const deleteChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mentorId = req.user?.id;

    if (!mentorId) return res.status(401).json({ message: "Unauthorized" });

    const [chapter] = await db
      .select()
      .from(chapters)
      .innerJoin(courses, eq(chapters.courseId, courses.id))
      .where(eq(chapters.id, Number(id)));

    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    if (req.user?.role === "mentor" && chapter.courses.mentorId !== mentorId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await db.delete(chapters).where(eq(chapters.id, Number(id)));
    res.json({ message: "Chapter deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete chapter" });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mentorId = req.user?.id;

    if (!mentorId) return res.status(401).json({ message: "Unauthorized" });

    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, Number(id)));

    if (!course) return res.status(404).json({ message: "Course not found" });

    if (req.user?.role === "mentor" && course.mentorId !== mentorId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Drizzle/SQL typically handles cascades if defined in schema.
    // Explicitly delete assignments, progress, chapters if not cascading.
    await db
      .delete(courseAssignments)
      .where(eq(courseAssignments.courseId, Number(id)));

    const courseChapters = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.courseId, Number(id)));
    const chapterIds = courseChapters.map((c) => c.id);
    if (chapterIds.length > 0) {
      await db.delete(progress).where(inArray(progress.chapterId, chapterIds));
      await db.delete(chapters).where(eq(chapters.courseId, Number(id)));
    }

    await db.delete(courses).where(eq(courses.id, Number(id)));

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Delete Course Error:", error);
    res.status(500).json({ message: "Failed to delete course" });
  }
};

export const assignCourseToStudent = async (req: Request, res: Response) => {
  try {
    const { courseId, studentId } = req.body;
    const mentorId = req.user?.id;

    if (!mentorId) return res.status(401).json({ message: "Unauthorized" });

    // Verify ownership if mentor
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, Number(courseId)));
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (req.user?.role === "mentor" && course.mentorId !== mentorId) {
      return res
        .status(403)
        .json({ message: "You can only assign students to your own courses" });
    }

    // Check if exists
    const existing = await db
      .select()
      .from(courseAssignments)
      .where(
        and(
          eq(courseAssignments.courseId, Number(courseId)),
          eq(courseAssignments.studentId, Number(studentId))
        )
      );

    if (existing.length > 0)
      return res.status(400).json({ message: "Student already assigned" });

    await db.insert(courseAssignments).values({
      courseId: Number(courseId),
      studentId: Number(studentId),
      assignedAt: new Date(),
    });

    res.json({ message: "Student assigned successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to assign course" });
  }
};

export const getMentorStats = async (req: Request, res: Response) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) return res.status(401).json({ message: "Unauthorized" });

    // 1. Get My Courses
    const myCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.mentorId, mentorId));

    // 2. For each course, get student progress
    const detailedStats = await Promise.all(
      myCourses.map(async (course) => {
        const courseStudents = await db
          .select({
            studentId: users.id,
            name: users.name,
            email: users.email,
            assignedAt: courseAssignments.assignedAt,
          })
          .from(courseAssignments)
          .innerJoin(users, eq(courseAssignments.studentId, users.id))
          .where(eq(courseAssignments.courseId, course.id));

        // Calculate completion for each student
        const studentsWithProgress = await Promise.all(
          courseStudents.map(async (student) => {
            // Total chapters for this course
            const chapterCount = (
              await db
                .select({ count: sql<number>`count(*)` })
                .from(chapters)
                .where(eq(chapters.courseId, course.id))
            )[0].count;

            // User completed
            const completedCount = (
              await db
                .select({ count: sql<number>`count(*)` })
                .from(progress)
                .innerJoin(chapters, eq(progress.chapterId, chapters.id))
                .where(
                  and(
                    eq(progress.studentId, student.studentId),
                    eq(chapters.courseId, course.id),
                    eq(progress.isCompleted, true)
                  )
                )
            )[0].count;

            return {
              ...student,
              progress:
                Number(chapterCount) === 0
                  ? 0
                  : Math.round(
                      (Number(completedCount) / Number(chapterCount)) * 100
                    ),
            };
          })
        );

        return {
          courseTitle: course.title,
          courseId: course.id,
          students: studentsWithProgress,
        };
      })
    );

    res.json(detailedStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get stats" });
  }
};
