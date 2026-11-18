import { prisma } from "../../lib/prisma";

interface ICreateContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const createContactMessageIntoDB = async (payload: ICreateContactMessage) => {
  return prisma.contactMessage.create({
    data: payload,
    select: { id: true, createdAt: true },
  });
};

const getContactMessagesFromDB = async (page: number, limit: number) => {
  const take = Math.min(Math.max(limit, 1), 50);
  const skip = (Math.max(page, 1) - 1) * take;

  const [messages, total] = await Promise.all([
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.contactMessage.count(),
  ]);

  return { messages, meta: { page: Math.max(page, 1), limit: take, total } };
};

export const contactService = {
  createContactMessageIntoDB,
  getContactMessagesFromDB,
};
