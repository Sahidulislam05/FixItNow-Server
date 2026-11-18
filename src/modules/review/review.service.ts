import httpStatus from "http-status";
import { BookingStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { ICreateReviewPayload } from "./review.interface";

const createReviewIntoDB = async (
  customerId: string,
  payload: ICreateReviewPayload,
) => {
  const { bookingId, rating, comment } = payload;

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { review: true },
  });

  if (booking.customerId !== customerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not the owner of this booking",
    );
  }

  if (booking.status !== BookingStatus.COMPLETED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You can only review a booking after the job is completed",
    );
  }

  if (booking.review) {
    throw new AppError(
      httpStatus.CONFLICT,
      "You have already reviewed this booking",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        bookingId,
        customerId,
        technicianId: booking.technicianId,
        rating,
        comment,
      },
    });

    const aggregate = await tx.review.aggregate({
      where: { technicianId: booking.technicianId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.technicianProfile.update({
      where: { userId: booking.technicianId },
      data: {
        avgRating: aggregate._avg.rating ?? 0,
        totalReviews: aggregate._count.rating,
      },
    });

    return review;
  });

  return result;
};

/** Latest written reviews for the public home page. Only exposes first names. */
const getRecentReviewsFromDB = async (limit: number) => {
  const reviews = await prisma.review.findMany({
    where: { comment: { not: null } },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 12),
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      customer: { select: { name: true } },
      technician: { select: { id: true, name: true } },
      booking: {
        select: {
          service: {
            select: { title: true, category: { select: { name: true } } },
          },
        },
      },
    },
  });

  return reviews.map(({ customer, ...review }) => ({
    ...review,
    customerName: customer.name.split(" ")[0],
  }));
};

export const reviewService = {
  createReviewIntoDB,
  getRecentReviewsFromDB,
};
