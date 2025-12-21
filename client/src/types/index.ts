export interface User {
  id: number;
  name: string;
  email: string;
  role: "student" | "mentor" | "admin";
  isEnrolled?: boolean;
}

export interface AuthResponse {
  token: string;
  id: number;
  email: string;
  role: "student" | "mentor" | "admin";
  name: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  mentorId: number;
  createdAt: string;
}

export interface Chapter {
  id: number;
  courseId: number;
  title: string;
  description: string;
  videoUrl?: string;
  imageUrl?: string;
  sequence: number;
  isLocked?: boolean;
  isCompleted?: boolean;
}

export interface Progress {
  id: number;
  chapterId: number;
  isCompleted: boolean;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatContact {
  id: number;
  name: string;
  role: "student" | "mentor" | "admin";
  unreadCount?: number;
}
