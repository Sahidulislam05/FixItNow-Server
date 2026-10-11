import { InputJsonValue } from "@prisma/client/runtime/client";
import httpStatus from "http-status";
import {
  BookingStatus,
  PaymentStatus,
  Role,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { sslCommerzService } from "../../lib/sslcommerz";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const initiatePaymentIntoDB = async (bookingId: string, customerId: string) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
  });

  if (booking.customerId !== customerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not the owner of this booking",
    );
  }

  if (booking.status !== BookingStatus.ACCEPTED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Payment can only be initiated for an ACCEPTED booking. Current status: ${booking.status}`,
    );
  }

  const customer = await prisma.user.findUniqueOrThrow({
    where: { id: customerId },
  });

  // আগের কোনো PENDING payment attempt থাকলে সেটাকে বাতিল করে দেওয়া হচ্ছে,
  // যাতে একই বুকিং এর জন্য একাধিক PENDING রেকর্ড জমে না থাকে
  await prisma.payment.updateMany({
    where: { bookingId, status: PaymentStatus.PENDING },
    data: { status: PaymentStatus.CANCELLED },
  });

  const tranId = `FIXITNOW_${Date.now()}_${booking.id.slice(0, 8)}`;

  const backendUrl = (
    config.app_url || "https://fix-it-now-bd.vercel.app"
  ).replace(/\/$/, "");

  const sslResponse = await sslCommerzService.initSession({
    total_amount: Number(booking.totalPrice),
    tran_id: tranId,
    success_url: `${backendUrl}/api/payments/confirm?tranId=${tranId}&status=success`,
    fail_url: `${backendUrl}/api/payments/confirm?tranId=${tranId}&status=fail`,
    cancel_url: `${backendUrl}/api/payments/confirm?tranId=${tranId}&status=cancel`,
    cus_name: customer.name,
    cus_email: customer.email,
    cus_phone: customer.phone || undefined,
  });

  if (!sslResponse.GatewayPageURL) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Failed to initiate payment session with SSLCommerz",
    );
  }

  await prisma.payment.create({
    data: {
      tranId,
      bookingId: booking.id,
      amount: booking.totalPrice,
    },
  });

  return {
    gatewayPageURL: sslResponse.GatewayPageURL,
    tranId,
  };
};

const confirmPaymentInDB = async (
  tranId: string,
  status: string,
  payload: Record<string, unknown>,
) => {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { tranId },
  });

  if (status !== "success") {
    const failStatus =
      status === "cancel" ? PaymentStatus.CANCELLED : PaymentStatus.FAILED;

    await prisma.payment.update({
      where: { tranId },
      data: { status: failStatus, meta: payload as InputJsonValue },
    });

    return { status: failStatus, bookingId: payment.bookingId };
  }

  const valId = payload.val_id as string | undefined;

  if (!valId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "val_id missing in SSLCommerz callback payload",
    );
  }

  const validationResult = await sslCommerzService.validateTransaction(valId);

  if (
    validationResult.status === "VALID" ||
    validationResult.status === "VALIDATED"
  ) {
    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { tranId },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          meta: payload as InputJsonValue,
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: BookingStatus.PAID },
      });

      return { updatedPayment, updatedBooking };
    });

    return { status: PaymentStatus.PAID, bookingId: result.updatedBooking.id };
  }

  await prisma.payment.update({
    where: { tranId },
    data: { status: PaymentStatus.FAILED, meta: payload as InputJsonValue },
  });

  return { status: PaymentStatus.FAILED, bookingId: payment.bookingId };
};

const getMyPaymentsFromDB = async (
  customerId: string,
  query: { page?: string; limit?: string },
) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;

  const whereClause = { booking: { customerId } };

  const payments = await prisma.payment.findMany({
    where: whereClause,

    take: limit,
    skip: skip,

    orderBy: { createdAt: "desc" },

    include: {
      booking: {
        include: { service: { include: { category: true } } },
      },
    },
  });

  const total = await prisma.payment.count({ where: whereClause });

  return {
    data: payments,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getPaymentByIdFromDB = async (
  paymentId: string,
  userId: string,
  role: Role,
) => {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: {
      booking: {
        include: {
          service: { include: { category: true } },
          customer: { omit: { password: true } },
          technician: { omit: { password: true } },
        },
      },
    },
  });

  const isOwner =
    payment.booking.customerId === userId ||
    payment.booking.technicianId === userId;

  if (role !== Role.ADMIN && !isOwner) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have permission to view this payment",
    );
  }

  return payment;
};

export const paymentService = {
  initiatePaymentIntoDB,
  confirmPaymentInDB,
  getMyPaymentsFromDB,
  getPaymentByIdFromDB,
};
