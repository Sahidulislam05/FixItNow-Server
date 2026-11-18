import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { reviewService } from "./review.service";

const createReview = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const customerId = req.user?.id as string;

    const payload = req.body;

    const review = await reviewService.createReviewIntoDB(customerId, payload);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Review submitted successfully",
      data: { review },
    });
  },
);

const getRecentReviews = catchAsync(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 6;
  const reviews = await reviewService.getRecentReviewsFromDB(limit);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Recent reviews retrieved successfully",
    data: { reviews },
  });
});

export const reviewController = {
  createReview,
  getRecentReviews,
};
