import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { contactService } from "./contact.service";

const createContactMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await contactService.createContactMessageIntoDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Thanks! Your message has been received.",
    data: result,
  });
});

const getContactMessages = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { messages, meta } = await contactService.getContactMessagesFromDB(page, limit);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Contact messages retrieved successfully",
    data: { messages },
    meta,
  });
});

export const contactController = {
  createContactMessage,
  getContactMessages,
};
