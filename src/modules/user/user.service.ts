import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { IRegisterUserPayload, IUpdateProfilePayload } from "./user.interface";

const registerUserIntoDB = async (payload: IRegisterUserPayload) => {
  const { name, email, password, phone, role } = payload;

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds),
  );

  const finalRole = role === Role.TECHNICIAN ? Role.TECHNICIAN : Role.CUSTOMER;

  const createdUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone,
      role: finalRole,
      technicianProfile:
        finalRole === Role.TECHNICIAN ? { create: {} } : undefined,
    },
    omit: {
      password: true,
    },
    include: {
      technicianProfile: true,
    },
  });

  return createdUser;
};

const getMyProfileFromDB = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    omit: {
      password: true,
    },
    include: {
      technicianProfile: true,
    },
  });

  return user;
};

const updateMyProfileInDB = async (
  userId: string,
  payload: IUpdateProfilePayload,
) => {
  const { name, phone } = payload;

  const updatedUser = await prisma.user.update({
    where: { id: userId },

    data: {
      name,
      phone,
    },

    omit: {
      password: true,
    },

    include: {
      technicianProfile: true,
    },
  });

  return updatedUser;
};

/** Public demo accounts share one password, so nobody may change it. */
const DEMO_EMAILS = new Set(
  (process.env.DEMO_LOCKED_EMAILS || "customer@fixitnow.com,technician@fixitnow.com,admin@fixitnow.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

const changePasswordInDB = async (
  userId: string,
  payload: { currentPassword: string; newPassword: string },
) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (DEMO_EMAILS.has(user.email.toLowerCase())) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Demo account passwords can't be changed. Create your own account to try this.",
    );
  }

  const matches = await bcrypt.compare(payload.currentPassword, user.password);
  if (!matches) {
    throw new AppError(httpStatus.BAD_REQUEST, "Current password is incorrect");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: await bcrypt.hash(payload.newPassword, Number(config.bcrypt_salt_rounds)),
    },
  });
};

export const userService = {
  registerUserIntoDB,
  getMyProfileFromDB,
  updateMyProfileInDB,
  changePasswordInDB,
};
