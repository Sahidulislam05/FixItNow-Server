import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums";
import config from "../../config";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { paymentService } from "./payment.service";

const createPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const customerId = req.user?.id as string;

    const { bookingId } = req.body;

    const result = await paymentService.initiatePaymentIntoDB(
      bookingId,
      customerId,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Payment session created successfully",
      data: result,
    });
  },
);

const confirmPayment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { tranId, status } = req.query;
    const payload = req.body;

    // ফ্রন্টএন্ডের Base URL
    const frontendUrl =
      config.frontend_url || "https://fix-it-now-bd.vercel.app";

    if (!tranId || !status) {
      return res.redirect(
        `${frontendUrl}/payment/fail?message=Missing+transaction+details`,
      );
    }

    try {
      const result = await paymentService.confirmPaymentInDB(
        tranId as string,
        status as string,
        payload,
      );

      // 🔄 পেমেন্ট স্ট্যাটাস অনুযায়ী ফ্রন্টএন্ড পেজে রিডাইরেক্ট করা হচ্ছে
      if (result.status === "PAID") {
        return res.redirect(
          `${frontendUrl}/payment/success?tranId=${tranId}&bookingId=${result.bookingId || ""}`,
        );
      } else if (result.status === "CANCELLED") {
        return res.redirect(`${frontendUrl}/payment/cancel?tranId=${tranId}`);
      } else {
        return res.redirect(`${frontendUrl}/payment/fail?tranId=${tranId}`);
      }
    } catch (error) {
      // কোনো এরর হলে ফেল পেজে নিয়ে যাবে
      return res.redirect(`${frontendUrl}/payment/fail?tranId=${tranId || ""}`);
    }
  },
);

const getMyPayments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const customerId = req.user?.id as string;

    const query = req.query;

    const result = await paymentService.getMyPaymentsFromDB(customerId, query);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Payment history retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getPaymentById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const role = req.user?.role as Role;

    const paymentId = req.params.id as string;

    if (!paymentId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Payment ID required in params",
      );
    }

    const payment = await paymentService.getPaymentByIdFromDB(
      paymentId,
      userId,
      role,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Payment retrieved successfully",
      data: { payment },
    });
  },
);

export const paymentController = {
  createPayment,
  confirmPayment,
  getMyPayments,
  getPaymentById,
};
