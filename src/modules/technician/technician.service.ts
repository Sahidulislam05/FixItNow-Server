import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums";
import { UserWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  IAvailabilitySlot,
  ITechnicianQuery,
  IUpdateTechnicianProfilePayload,
} from "./technician.interface";

const updateMyTechnicianProfileInDB = async (
  userId: string,
  payload: IUpdateTechnicianProfilePayload,
) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  if (user.role !== Role.TECHNICIAN) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only technicians can update a technician profile",
    );
  }

  const updatedProfile = await prisma.technicianProfile.update({
    where: { userId },
    data: payload,
  });

  return updatedProfile;
};

const setMyAvailabilityInDB = async (
  userId: string,
  slots: IAvailabilitySlot[],
) => {
  const result = await prisma.$transaction(async (tx) => {
    await tx.technicianAvailability.deleteMany({
      where: { technicianId: userId },
    });

    await tx.technicianAvailability.createMany({
      data: slots.map((slot) => ({
        technicianId: userId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive ?? true,
      })),
    });

    const availabilities = await tx.technicianAvailability.findMany({
      where: { technicianId: userId },
    });

    return availabilities;
  });

  return result;
};

const getMyAvailabilityFromDB = async (userId: string) => {
  const availabilities = await prisma.technicianAvailability.findMany({
    where: { technicianId: userId },
  });

  return availabilities;
};

const getAllTechniciansFromDB = async (query: ITechnicianQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortOrder: "asc" | "desc" = query.sortOrder === "asc" ? "asc" : "desc";

  // Only known fields reach Prisma; anything else falls back to newest first.
  const orderBy =
    query.sortBy === "avgRating" || query.sortBy === "experienceYears"
      ? { technicianProfile: { [query.sortBy]: sortOrder } }
      : query.sortBy === "name"
        ? { name: sortOrder }
        : { createdAt: sortOrder };

  const andConditions: UserWhereInput[] = [{ role: Role.TECHNICIAN }];

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: query.searchTerm, mode: "insensitive" } },
        { technicianProfile: { skills: { hasSome: [query.searchTerm] } } },
        {
          technicianProfile: {
            bio: { contains: query.searchTerm, mode: "insensitive" },
          },
        },
      ],
    });
  }

  if (query.categoryId) {
    andConditions.push({
      services: { some: { categoryId: query.categoryId, isActive: true } },
    });
  }

  if (query.minRating) {
    andConditions.push({
      technicianProfile: { avgRating: { gte: Number(query.minRating) } },
    });
  }

  const technicians = await prisma.user.findMany({
    where: { AND: andConditions },

    take: limit,
    skip: skip,

    orderBy,

    omit: {
      password: true,
    },

    include: {
      technicianProfile: true,
      services: {
        where: { isActive: true },
        include: { category: true },
      },
    },
  });

  const total = await prisma.user.count({
    where: { AND: andConditions },
  });

  return {
    data: technicians,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getTechnicianByIdFromDB = async (technicianId: string) => {
  const technician = await prisma.user.findUniqueOrThrow({
    where: {
      id: technicianId,
      role: Role.TECHNICIAN,
    },

    omit: {
      password: true,
    },

    include: {
      technicianProfile: true,
      services: {
        where: { isActive: true },
        include: { category: true },
      },
      availabilities: {
        where: { isActive: true },
      },
      reviewsAsTechnician: {
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return technician;
};

export const technicianService = {
  updateMyTechnicianProfileInDB,
  setMyAvailabilityInDB,
  getMyAvailabilityFromDB,
  getAllTechniciansFromDB,
  getTechnicianByIdFromDB,
};
