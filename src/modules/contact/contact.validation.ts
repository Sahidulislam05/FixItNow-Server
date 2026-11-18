import { z } from "zod";

const createContactMessageValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(120, "Name can not be more than 120 characters"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .email("Please provide a valid email address"),
    subject: z
      .string({ required_error: "Subject is required" })
      .trim()
      .min(5, "Subject must be at least 5 characters")
      .max(160, "Subject can not be more than 160 characters"),
    message: z
      .string({ required_error: "Message is required" })
      .trim()
      .min(20, "Message must be at least 20 characters")
      .max(2000, "Message can not be more than 2000 characters"),
  }),
});

export const contactValidation = {
  createContactMessageValidationSchema,
};
