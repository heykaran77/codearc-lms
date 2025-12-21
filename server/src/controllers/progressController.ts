import { Request, Response } from "express";
import { db } from "../db";
import {
  courses,
  courseAssignments,
  chapters,
  progress,
  users,
} from "../db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { notifyRole, createNotification } from "./notificationController";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 1. Get Enrolled Courses
    const enrolledCourses = await db
      .select({
        courseId: courseAssignments.courseId,
        title: courses.title,
        description: courses.description,
        assignedAt: courseAssignments.assignedAt,
      })
      .from(courseAssignments)
      .innerJoin(courses, eq(courseAssignments.courseId, courses.id))
      .where(eq(courseAssignments.studentId, studentId));

    const totalEnrolled = enrolledCourses.length;
    let completedCount = 0;
    let inProgressCount = 0;

    // Calculate progress for each course
    const detailedCourses = await Promise.all(
      enrolledCourses.map(async (course) => {
        // Total chapters for the course
        const courseChapters = await db
          .select({ id: chapters.id })
          .from(chapters)
          .where(eq(chapters.courseId, course.courseId));

        const totalChapters = courseChapters.length;

        // Completed chapters for the student in this course
        // We look for progress records matching these chapter IDs
        let completedChapters = 0;
        if (totalChapters > 0) {
          const completedRecords = await db
            .select()
            .from(progress)
            .where(
              and(
                eq(progress.studentId, studentId),
                eq(progress.isCompleted, true)
              )
            );

          // Filter records that belong to this course's chapters
          const courseChapterIds = courseChapters.map((c) => c.id);
          completedChapters = completedRecords.filter((p) =>
            courseChapterIds.includes(p.chapterId)
          ).length;
        }

        const progressPercent =
          totalChapters === 0
            ? 0
            : Math.round((completedChapters / totalChapters) * 100);

        if (progressPercent === 100 && totalChapters > 0) {
          completedCount++;
        } else {
          inProgressCount++;
        }

        return {
          ...course,
          progress: progressPercent,
        };
      })
    );
    // Sort by assignedAt descending for "Recent"
    detailedCourses.sort((a, b) => {
      const dateA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
      const dateB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
      return dateB - dateA;
    });

    // 2. Get All Courses to find Unenrolled/New ones
    const allCoursesList = await db.select().from(courses);
    const enrolledIds = enrolledCourses.map((c) => c.courseId);

    // Filter courses the student is NOT enrolled in
    const recommendedCourses = allCoursesList
      .filter((c) => !enrolledIds.includes(c.id))
      .map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        mentorId: c.mentorId,
        createdAt: c.createdAt,
      }))
      .slice(0, 4); // Limit to top 4 recommendations

    res.json({
      stats: {
        enrolled: totalEnrolled,
        completed: completedCount,
        inProgress: inProgressCount,
        certificates: completedCount,
      },
      recentCourses: detailedCourses.slice(0, 5),
      recommendedCourses: recommendedCourses,
    });
  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};

export const completeChapter = async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // 1. Get the Current Chapter details
    const [currentChapter] = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, Number(chapterId)));

    if (!currentChapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // 2. Check Previous Chapter Completion (Strict Sequence)
    if (currentChapter.sequence > 1) {
      const [prevChapter] = await db
        .select()
        .from(chapters)
        .where(
          and(
            eq(chapters.courseId, currentChapter.courseId),
            eq(chapters.sequence, currentChapter.sequence - 1)
          )
        );

      if (prevChapter) {
        const [prevProgress] = await db
          .select()
          .from(progress)
          .where(
            and(
              eq(progress.studentId, userId),
              eq(progress.chapterId, prevChapter.id),
              eq(progress.isCompleted, true)
            )
          );

        if (!prevProgress) {
          return res
            .status(403)
            .json({ message: "You must complete the previous chapter first." });
        }
      }
    }

    // 3. Mark as Completed
    // Check if already exists
    const [existingProgress] = await db
      .select()
      .from(progress)
      .where(
        and(
          eq(progress.studentId, userId),
          eq(progress.chapterId, Number(chapterId))
        )
      );

    if (existingProgress) {
      if (!existingProgress.isCompleted) {
        await db
          .update(progress)
          .set({ isCompleted: true, completedAt: new Date() })
          .where(eq(progress.id, existingProgress.id));
      }
    } else {
      await db.insert(progress).values({
        studentId: userId,
        chapterId: Number(chapterId),
        isCompleted: true,
        completedAt: new Date(),
      });
    }

    // Check for Course Completion trigger
    const courseChapters = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.courseId, currentChapter.courseId));
    const totalChapters = courseChapters.length;

    // We need to count completed chapters for THIS course
    const courseChapterIds = courseChapters.map((c) => c.id);

    // Efficiently count completed chapters for this course
    const completedCountRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(progress)
      .where(
        and(
          eq(progress.studentId, userId),
          eq(progress.isCompleted, true),
          inArray(progress.chapterId, courseChapterIds)
        )
      );

    const completedCount = completedCountRes[0].count;

    if (Number(completedCount) === totalChapters) {
      // Fetch course & user info
      const [course] = await db
        .select()
        .from(courses)
        .where(eq(courses.id, currentChapter.courseId));
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (course && user) {
        // Notify Admin
        await notifyRole(
          "admin",
          "Course Completion",
          `Student ${user.name} has completed the course "${course.title}".`,
          "success"
        );

        // Notify Student
        await createNotification(
          userId,
          "Course Completed",
          `Congratulations! You have completed "${course.title}". You can now download your certificate.`,
          "success"
        );

        // Notify Mentor
        await createNotification(
          course.mentorId,
          "Student Completed",
          `${user.name} has completed your course "${course.title}".`,
          "success"
        );
      }
    }

    res.json({ message: "Chapter completed successfully" });
  } catch (error: any) {
    console.error("Complete Chapter Error:", error);
    res.status(500).json({ message: "Failed to complete chapter" });
  }
};

export const getProgress = async (req: Request, res: Response) => {
  res.json({ message: "Get progress" });
};

export const downloadCertificate = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Count Course Chapters
    const courseChapters = await db
      .select()
      .from(chapters)
      .where(eq(chapters.courseId, Number(courseId)));

    const totalChapters = courseChapters.length;

    if (totalChapters === 0) {
      return res.status(400).json({ message: "Course has no content" });
    }

    // Count Completed Chapters
    const courseChapterIds = courseChapters.map((c) => c.id);

    const completedRecords = await db
      .select()
      .from(progress)
      .where(
        and(eq(progress.studentId, userId), eq(progress.isCompleted, true))
      );

    const completedCount = completedRecords.filter((p) =>
      courseChapterIds.includes(p.chapterId)
    ).length;

    if (completedCount !== totalChapters) {
      return res.status(403).json({
        message: "Cannot download certificate. Course not 100% completed.",
      });
    }

    // Fetch User, Course, & Mentor Info
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, Number(courseId)));

    if (!user || !course) {
      return res.status(404).json({ message: "Data not found." });
    }

    const [mentor] = await db
      .select()
      .from(users)
      .where(eq(users.id, course.mentorId));

    // Generate PDF
    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4", // 841.89 x 595.28 points
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=certificate-${courseId}.pdf`
    );

    doc.pipe(res);

    // --- DESIGN ---
    const width = doc.page.width;
    const height = doc.page.height;

    // 1. Background (Light Cream/Gray)
    doc.rect(0, 0, width, height).fill("#F7F9FC");

    // 2. Sidebar (Right Side - Blue & Gold)
    const sidebarWidth = 200;
    const sidebarX = width - sidebarWidth;

    // Dark Blue Strip
    doc.rect(sidebarX, 0, sidebarWidth, height).fill("#1e3a8a"); // Dark Blue

    // Gold Accent Lines
    doc.rect(sidebarX - 15, 0, 15, height).fill("#d97706"); // Gold/Amber
    doc.rect(sidebarX + 20, 0, 10, height).fill("#fbbf24"); // Light Gold stripe inside blue

    // Badge Circle (Simulated)
    const badgeX = sidebarX;
    const badgeY = height / 2;
    doc.circle(badgeX, badgeY, 60).fill("#d97706"); // Outer Gold
    doc.circle(badgeX, badgeY, 50).fill("#1e3a8a"); // Inner Blue
    doc
      .font("Times-Bold")
      .fontSize(14)
      .fillColor("#fbbf24")
      .text("CODEARC", badgeX - 35, badgeY - 7);

    // 3. Content Area (Left Side)
    const contentWidth = width - sidebarWidth - 20; // Subtract sidebar + padding
    const centerX = contentWidth / 2;

    // LOGO / BRAND
    doc.rect(50, 40, 40, 40).fill("#ffedd5"); // Orange bg
    doc
      .fontSize(30)
      .fillColor("#ea580c") // Orange text
      .font("Helvetica-Bold")
      .text("C", 60, 45);

    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("#ea580c")
      .text("CodeArc", 100, 50);

    let currentY = 120;

    // TITLE: CERTIFICATE
    doc
      .font("Times-Bold")
      .fontSize(50)
      .fillColor("#1e3a8a") // Dark Blue
      .text("CERTIFICATE", 0, currentY, {
        width: contentWidth,
        align: "center",
      });

    currentY += 55;

    // SUBTITLE: OF ACHIEVEMENT
    doc
      .font("Times-Roman")
      .fontSize(20)
      .fillColor("#64748b") // Gray
      .text("OF ACHIEVEMENT", 0, currentY, {
        width: contentWidth,
        align: "center",
      });

    currentY += 50;

    // PROUDLY PRESENTED TO
    doc
      .fontSize(14)
      .fillColor("#94a3b8")
      .text("PROUDLY PRESENTED TO", 0, currentY, {
        width: contentWidth,
        align: "center",
      });

    currentY += 30;

    // STUDENT NAME
    doc
      .font("Times-Italic") // Simulating script
      .fontSize(45)
      .fillColor("#1e293b") // Dark Slate
      .text(user.name, 0, currentY, { width: contentWidth, align: "center" });

    // Underline name
    const nameWidth = doc.widthOfString(user.name);
    doc
      .moveTo(centerX - 150, currentY + 50)
      .lineTo(centerX + 150, currentY + 50)
      .strokeColor("#d97706") // Gold
      .lineWidth(2)
      .stroke();

    currentY += 70;

    // BODY TEXT
    doc
      .font("Times-Roman")
      .fontSize(14)
      .fillColor("#64748b")
      .text(
        `For successfully completing the course "${course.title}". This certificate acknowledges your dedication, hard work, and mastery of the subject matter.`,
        50,
        currentY,
        { width: contentWidth - 100, align: "center", lineGap: 6 }
      );

    currentY += 100;

    // SIGNATURES AREA
    const sigY = height - 100;

    // Mentor Signature
    doc
      .moveTo(100, sigY)
      .lineTo(300, sigY)
      .strokeColor("#94a3b8")
      .lineWidth(1)
      .stroke();

    doc
      .font("Times-Bold")
      .fontSize(16)
      .fillColor("#1e3a8a")
      .text(mentor ? mentor.name : "Mentor", 100, sigY + 10, {
        width: 200,
        align: "center",
      });

    doc
      .font("Times-Roman")
      .fontSize(12)
      .fillColor("#94a3b8")
      .text("MENTOR", 100, sigY + 30, { width: 200, align: "center" });

    // Date
    doc
      .moveTo(contentWidth - 300, sigY)
      .lineTo(contentWidth - 100, sigY)
      .stroke();

    doc
      .font("Times-Bold")
      .fontSize(16)
      .fillColor("#1e3a8a")
      .text(new Date().toLocaleDateString(), contentWidth - 300, sigY + 10, {
        width: 200,
        align: "center",
      });

    doc
      .font("Times-Roman")
      .fontSize(12)
      .fillColor("#94a3b8")
      .text("DATE", contentWidth - 300, sigY + 30, {
        width: 200,
        align: "center",
      });

    doc.end();
  } catch (error: any) {
    console.error("Certificate Error:", error);
    // If headers sent, we can't send JSON error, but usually PDFKit errors before piping mostly.
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to download certificate" });
    }
  }
};
