// Schema definitions will go here
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

// Define Roles
export const roleEnum = pgEnum("role", ["student", "mentor", "admin"]);

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").default("student").notNull(),
  isApproved: boolean("is_approved").default(false), // For mentors
  createdAt: timestamp("created_at").defaultNow(),
});
  
// Courses Table
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  mentorId: integer("mentor_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chapters Table
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .references(() => courses.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  sequence: integer("sequence").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Course Assignments Table
export const courseAssignments = pgTable("course_assignments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .references(() => courses.id)
    .notNull(),
  studentId: integer("student_id")
    .references(() => users.id)
    .notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Progress Table
export const progress = pgTable("progress", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .references(() => users.id)
    .notNull(),
  chapterId: integer("chapter_id")
    .references(() => chapters.id)
    .notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
});

// Notifications Table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews / Activity Updates Table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .references(() => users.id)
    .notNull(),
  courseId: integer("course_id")
    .references(() => courses.id)
    .notNull(),
  content: text("content").notNull(), // The update/review content
  status: varchar("status", { length: 50 }).default("pending"), // pending, seen, changes_requested, approved
  mentorComment: text("mentor_comment"),
  createdAt: timestamp("created_at").defaultNow(),
});
