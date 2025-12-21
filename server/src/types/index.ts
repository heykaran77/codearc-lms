export interface UserPayload {
  id: number;
  email: string;
  role: "student" | "mentor" | "admin";
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
