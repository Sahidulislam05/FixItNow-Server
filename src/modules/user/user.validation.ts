import { z } from "zod";
import { Role } from "../../../generated/prisma/enums";

const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;

const registerUserValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters long")
      .max(255, "Name can not be more than 255 characters"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .email("Please provide a valid email address"),
    password: z
      .string({ required_error: "Password is required" })
      .min(8, "Password must be at least 8 characters long")
      .regex(/[A-Za-z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    phone: z
      .string()
      .trim()
      .regex(BD_PHONE, "Enter a valid Bangladeshi mobile number, e.g. 01712345678")
      .optional()
      .or(z.literal("")),
    role: z.enum([Role.CUSTOMER, Role.TECHNICIAN]).optional(),
  }),
});

const updateProfileValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(255).optional(),
    phone: z
      .string()
      .trim()
      .regex(BD_PHONE, "Enter a valid Bangladeshi mobile number, e.g. 01712345678")
      .optional()
      .or(z.literal("")),
  }),
});

const changePasswordValidationSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string({ required_error: "Current password is required" })
        .min(1, "Current password is required"),
      newPassword: z
        .string({ required_error: "New password is required" })
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Za-z]/, "Password must contain at least one letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: "New password must be different from the current one",
      path: ["newPassword"],
    }),
});

export const userValidation = {
  registerUserValidationSchema,
  updateProfileValidationSchema,
  changePasswordValidationSchema,
};
