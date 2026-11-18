import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { contactController } from "./contact.controller";
import { contactValidation } from "./contact.validation";

const router = Router();

router.post(
  "/",
  validateRequest(contactValidation.createContactMessageValidationSchema),
  contactController.createContactMessage,
);

router.get("/", auth(Role.ADMIN), contactController.getContactMessages);

export const contactRoutes = router;
