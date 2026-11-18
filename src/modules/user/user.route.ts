import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { userController } from "./user.controller";
import { userValidation } from "./user.validation";

const router = Router();

router.post(
  "/register",
  validateRequest(userValidation.registerUserValidationSchema),
  userController.registerUser,
);

router.get(
  "/me",
  auth(Role.CUSTOMER, Role.TECHNICIAN, Role.ADMIN),
  userController.getMyProfile,
);

router.put(
  "/my-profile",
  auth(Role.CUSTOMER, Role.TECHNICIAN, Role.ADMIN),
  validateRequest(userValidation.updateProfileValidationSchema),
  userController.updateMyProfile,
);

router.patch(
  "/me/password",
  auth(Role.CUSTOMER, Role.TECHNICIAN, Role.ADMIN),
  validateRequest(userValidation.changePasswordValidationSchema),
  userController.changePassword,
);

export const userRoutes = router;
