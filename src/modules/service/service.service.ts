import httpStatus from "http-status";
import { ServiceWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  ICreateServicePayload,
  IServiceQuery,
  IUpdateServicePayload,
} from "./service.interface";

const createServiceIntoDB = async (
  technicianId: string,
  payload: ICreateServicePayload,
) => {
  const category = await prisma.category.findUnique({
    where: { id: payload.categoryId },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  const service = await prisma.service.create({
    data: {
      ...payload,
      technicianId,
    },
    include: {
      category: true,
    },
  });

  return service;
};

const getAllServicesFromDB = async (query: IServiceQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const SORTABLE_FIELDS = ["createdAt", "price", "title"];
  const sortBy = SORTABLE_FIELDS.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : "createdAt";
  const sortOrder: "asc" | "desc" = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: ServiceWhereInput[] = [{ isActive: true }];

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: query.searchTerm, mode: "insensitive" } },
        { description: { contains: query.searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (query.categoryId) {
    andConditions.push({ categoryId: query.categoryId });
  }

  if (query.location) {
    andConditions.push({
      location: { contains: query.location, mode: "insensitive" },
    });
  }

  if (query.minPrice || query.maxPrice) {
    andConditions.push({
      price: {
        gte: query.minPrice ? Number(query.minPrice) : undefined,
        lte: query.maxPrice ? Number(query.maxPrice) : undefined,
      },
    });
  }

  const services = await prisma.service.findMany({
    where: { AND: andConditions },

    take: limit,
    skip: skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    include: {
      category: true,
      technician: {
        omit: { password: true },
        include: { technicianProfile: true },
      },
    },
  });

  const total = await prisma.service.count({
    where: { AND: andConditions },
  });

  return {
    data: services,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getServiceByIdFromDB = async (serviceId: string) => {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
    include: {
      category: true,
      technician: {
        omit: { password: true },
        include: { technicianProfile: true },
      },
    },
  });

  return service;
};

const getMyServicesFromDB = async (technicianId: string) => {
  const services = await prisma.service.findMany({
    where: { technicianId },
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  return services;
};

const updateMyServiceInDB = async (
  serviceId: string,
  technicianId: string,
  payload: IUpdateServicePayload,
) => {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
  });

  if (service.technicianId !== technicianId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not the owner of this service",
    );
  }

  const updatedService = await prisma.service.update({
    where: { id: serviceId },
    data: payload,
    include: { category: true },
  });

  return updatedService;
};

const deleteMyServiceFromDB = async (
  serviceId: string,
  technicianId: string,
) => {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
  });

  if (service.technicianId !== technicianId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not the owner of this service",
    );
  }

  await prisma.service.update({
    where: { id: serviceId },
    data: { isActive: false },
  });
};

export const serviceService = {
  createServiceIntoDB,
  getAllServicesFromDB,
  getServiceByIdFromDB,
  getMyServicesFromDB,
  updateMyServiceInDB,
  deleteMyServiceFromDB,
};
