import { db } from "./db";
import {
  users,
  courses,
  chapters,
  courseAssignments,
  progress,
} from "./db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const seed = async () => {
  console.log("Seeding database...");

  // Clean up existing data (Reverse order of dependencies)
  await db.delete(progress);
  await db.delete(courseAssignments);
  await db.delete(chapters);
  await db.delete(courses);
  await db.delete(users);

  const hashedPassword = await bcrypt.hash("password123", 10);

  // 1. Create Users
  const [admin] = await db
    .insert(users)
    .values({
      name: "Admin User",
      email: "admin@test.com",
      password: hashedPassword,
      role: "admin",
    })
    .returning();

  const [mentor] = await db
    .insert(users)
    .values({
      name: "Jane Smith",
      email: "mentor@test.com",
      password: hashedPassword,
      role: "mentor",
      isApproved: true,
    })
    .returning();

  const [student] = await db
    .insert(users)
    .values({
      name: "Karan Singh", // Using user's name for personalization
      email: "student@test.com",
      password: hashedPassword,
      role: "student",
    })
    .returning();

  console.log("Users created.");

  // 2. Create Courses
  const courseData = [
    {
      title: "Working with AI",
      description:
        "Learn how to integrate artificial intelligence into your daily workflow. This course covers LLMs, generative imagery, and automation tools.",
    },
    {
      title: "Business Analytics",
      description:
        "Master data analysis with Excel, SQL, and Tableau. Understand business metrics and how to drive decision-making.",
    },
    {
      title: "Google AI Essentials",
      description:
        "Official course by Google covering the fundamentals of AI, machine learning bias, and ethical AI deployment.",
    },
    {
      title: "IBM Data Analyst",
      description:
        "Comprehensive path to becoming a data analyst. Covers Python, Pandas, NumPy, and data visualization.",
    },
    {
      title: "Cloud Computing",
      description:
        "Introduction to AWS, Azure, and Google Cloud Platform. Learn about serverless architecture and containerization.",
    },
    {
      title: "Blockchain Tech",
      description:
        "Understand the underlying technology behind cryptocurrencies, smart contracts, and decentralized applications.",
    },
  ];

  const createdCourses: any[] = [];
  for (const c of courseData) {
    const [newCourse] = await db
      .insert(courses)
      .values({
        title: c.title,
        description: c.description,
        mentorId: mentor.id,
      })
      .returning();
    createdCourses.push(newCourse);
  }
  console.log(`Created ${createdCourses.length} courses.`);

  // 3. Create Chapters for each course
  for (const course of createdCourses) {
    const chapterData = Array.from({ length: 12 }, (_, i) => ({
      courseId: course.id,
      title: `Lesson ${i + 1}: ${
        ["Introduction", "Core Concepts", "Advanced Topics", "Case Study"][
          i % 4
        ]
      }`,
      description: `In this lesson, we dive deep into the specific aspects of ${course.title}. You will learn practical skills.`,
      sequence: i + 1,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder video
    }));

    await db.insert(chapters).values(chapterData);
  }
  console.log("Chapters created.");

  // 4. Assign Student to Courses
  for (const course of createdCourses) {
    await db.insert(courseAssignments).values({
      courseId: course.id,
      studentId: student.id,
    });
  }
  console.log("Student assigned to courses.");

  // 5. Generate Random Progress
  // We'll give specific progress to match the "Activity" or stats somewhat
  // Course 1: ~30-40% done
  // Course 2: ~75% done
  const allChapters = await db.select().from(chapters);

  // Helper to mark chapters complete
  const markComplete = async (courseIndex: number, count: number) => {
    const targetCourse = createdCourses[courseIndex];
    const courseChapters = allChapters
      .filter((c) => c.courseId === targetCourse.id)
      .sort((a, b) => a.sequence - b.sequence);

    for (let i = 0; i < count && i < courseChapters.length; i++) {
      await db.insert(progress).values({
        studentId: student.id,
        chapterId: courseChapters[i].id,
        isCompleted: true, // Only 'isCompleted' based on schema
        completedAt: new Date(),
      });
    }
  };

  await markComplete(0, 4); // Course 1 (~30%)
  await markComplete(1, 9); // Course 2 (~75%)
  await markComplete(2, 2); // Course 3
  await markComplete(3, 10); // Course 4 nearly done

  console.log("Progress data generated.");
  console.log("Database Seeded Successfully!");
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seeding failed", err);
  process.exit(1);
});
