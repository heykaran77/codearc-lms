import { Request, Response } from "express";

export const createReview = async (req: Request, res: Response) => {
  res.json({ message: "Create review" });
};

export const getMyCourseReviews = async (req: Request, res: Response) => {
  res.json({ message: "Get my course reviews" });
};

export const getMentorPendingReviews = async (req: Request, res: Response) => {
  res.json({ message: "Get mentor pending reviews" });
};

export const updateReviewStatus = async (req: Request, res: Response) => {
  res.json({ message: "Update review status" });
};
