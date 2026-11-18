/**
 * Seeds the data needed to run and demo FixItNow end to end.
 *
 *   npm run seed
 *
 * Safe to run more than once: existing users, categories and demo bookings are
 * left untouched.
 *
 * Demo accounts (passwords can be overridden through env vars):
 *   customer@fixitnow.com   / DEMO_CUSTOMER_PASSWORD   (default "customer123")
 *   technician@fixitnow.com / DEMO_TECHNICIAN_PASSWORD (default "technician123")
 *   ADMIN_EMAIL             / ADMIN_PASSWORD
 *
 * The demo customer gets one booking in every stage of the workflow so each
 * dashboard action (accept, pay, start, complete, review, cancel) can be tried
 * straight away.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import {
  BookingStatus,
  DayOfWeek,
  PaymentStatus,
  Role,
} from "../generated/prisma/enums";
import config from "../src/config";
import { prisma } from "../src/lib/prisma";

const SALT_ROUNDS = Number(config.bcrypt_salt_rounds) || 12;

const CATEGORIES = [
  { name: "Plumbing", description: "Pipe fitting, leak repair, and water line installation", icon: "🔧" },
  { name: "Electrical", description: "Wiring, switchboard, and electrical appliance repair", icon: "⚡" },
  { name: "Cleaning", description: "Home deep cleaning and sanitization services", icon: "🧹" },
  { name: "Painting", description: "Interior and exterior wall painting", icon: "🎨" },
  { name: "AC Repair", description: "Air conditioner servicing, repair, and installation", icon: "❄️" },
  { name: "Carpentry", description: "Furniture repair and custom woodwork", icon: "🪚" },
  { name: "Appliance Repair", description: "Refrigerator, washing machine, and microwave repair", icon: "🛠️" },
  { name: "Pest Control", description: "Home pest and insect control treatment", icon: "🐜" },
];

const DEMO_CUSTOMER = {
  name: "Sadia Rahman",
  email: "customer@fixitnow.com",
  password: process.env.DEMO_CUSTOMER_PASSWORD || "customer123",
  phone: "01711000001",
};

const DEMO_TECHNICIAN = {
  name: "Arif Hossain",
  email: "technician@fixitnow.com",
  password: process.env.DEMO_TECHNICIAN_PASSWORD || "technician123",
  phone: "01711000002",
  profile: {
    bio: "Licensed electrician and AC technician with nine years of residential work across Dhaka. I carry spare parts for most common faults, so the majority of jobs are finished in a single visit.",
    experienceYears: 9,
    skills: ["Electrical wiring", "AC servicing", "Circuit breakers", "Ceiling fans"],
  },
  services: [
    {
      title: "Full AC Servicing (up to 2 ton)",
      category: "AC Repair",
      price: 1500,
      location: "Gulshan, Dhaka",
      description:
        "Indoor and outdoor unit cleaning, filter wash, gas pressure check and drain line flush. Includes a written report of anything that needs follow-up.",
    },
    {
      title: "Switchboard & Socket Repair",
      category: "Electrical",
      price: 800,
      location: "Banani, Dhaka",
      description:
        "Replace burnt sockets, loose switches or a damaged board. Price covers labour for one board; parts are billed at cost with receipts.",
    },
    {
      title: "Ceiling Fan Installation",
      category: "Electrical",
      price: 600,
      location: "Mohakhali, Dhaka",
      description:
        "Mounting, wiring and balancing of one ceiling fan, including regulator fitting. Old fan removal is included at no extra charge.",
    },
  ],
};

const WORKDAYS: DayOfWeek[] = [
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
];

function daysFromNow(days: number, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function upsertUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Role;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    console.log(`• ${input.role.toLowerCase()} already exists: ${input.email}`);
    return existing;
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      password: await bcrypt.hash(input.password, SALT_ROUNDS),
    },
  });
  console.log(`✓ created ${input.role.toLowerCase()}: ${input.email}`);
  return user;
}

async function seedCategories() {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
  console.log(`✓ ${CATEGORIES.length} categories ready`);
}

async function seedAdmin() {
  if (!config.admin_email || !config.admin_password) {
    console.log("• ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping admin");
    return;
  }
  await upsertUser({
    name: "FixItNow Admin",
    email: config.admin_email,
    password: config.admin_password,
    role: Role.ADMIN,
  });
}

async function seedDemoTechnician() {
  const technician = await upsertUser({ ...DEMO_TECHNICIAN, role: Role.TECHNICIAN });

  await prisma.technicianProfile.upsert({
    where: { userId: technician.id },
    update: {},
    create: { userId: technician.id, ...DEMO_TECHNICIAN.profile },
  });

  const availabilityCount = await prisma.technicianAvailability.count({
    where: { technicianId: technician.id },
  });
  if (availabilityCount === 0) {
    await prisma.technicianAvailability.createMany({
      data: WORKDAYS.map((dayOfWeek) => ({
        technicianId: technician.id,
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
      })),
    });
  }

  const categories = await prisma.category.findMany();
  const categoryId = (name: string) => categories.find((c) => c.name === name)!.id;

  for (const service of DEMO_TECHNICIAN.services) {
    const exists = await prisma.service.findFirst({
      where: { technicianId: technician.id, title: service.title },
    });
    if (exists) continue;

    await prisma.service.create({
      data: {
        technicianId: technician.id,
        categoryId: categoryId(service.category),
        title: service.title,
        description: service.description,
        price: service.price,
        location: service.location,
      },
    });
  }

  console.log("✓ demo technician profile, availability and services ready");
  return technician;
}

/** One booking per workflow stage so every dashboard action can be demoed. */
async function seedDemoBookings(customerId: string, technicianId: string) {
  const existing = await prisma.booking.count({
    where: { customerId, technicianId },
  });
  if (existing > 0) {
    console.log("• demo bookings already exist");
    return;
  }

  const services = await prisma.service.findMany({
    where: { technicianId },
    orderBy: { createdAt: "asc" },
  });
  const [acService, socketService, fanService] = services;
  const address = "House 12, Road 7, Block C, Banani, Dhaka 1213";

  const plan: {
    service: (typeof services)[number];
    status: BookingStatus;
    date: Date;
    paid?: boolean;
    review?: { rating: number; comment: string };
  }[] = [
    { service: acService, status: BookingStatus.REQUESTED, date: daysFromNow(3) },
    { service: socketService, status: BookingStatus.ACCEPTED, date: daysFromNow(2, 15) },
    { service: fanService, status: BookingStatus.PAID, date: daysFromNow(1, 11), paid: true },
    { service: acService, status: BookingStatus.IN_PROGRESS, date: daysFromNow(0, 9), paid: true },
    { service: socketService, status: BookingStatus.COMPLETED, date: daysFromNow(-6), paid: true },
    {
      service: fanService,
      status: BookingStatus.COMPLETED,
      date: daysFromNow(-14),
      paid: true,
      review: {
        rating: 5,
        comment:
          "Arrived on time, replaced the old fan and balanced the new one so it no longer wobbles. Cleaned up after himself too.",
      },
    },
  ];

  for (const item of plan) {
    const booking = await prisma.booking.create({
      data: {
        customerId,
        technicianId,
        serviceId: item.service.id,
        scheduledDate: item.date,
        address,
        status: item.status,
        totalPrice: item.service.price,
      },
    });

    if (item.paid) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          tranId: `DEMO-${randomUUID()}`,
          amount: item.service.price,
          status: PaymentStatus.PAID,
          paidAt: new Date(item.date.getTime() - 24 * 60 * 60 * 1000),
          meta: { note: "Seeded demo payment" },
        },
      });
    }

    if (item.review) {
      await prisma.review.create({
        data: {
          bookingId: booking.id,
          customerId,
          technicianId,
          ...item.review,
        },
      });
    }
  }

  const stats = await prisma.review.aggregate({
    where: { technicianId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.technicianProfile.update({
    where: { userId: technicianId },
    data: {
      avgRating: stats._avg.rating ?? 0,
      totalReviews: stats._count.rating,
    },
  });

  console.log(`✓ ${plan.length} demo bookings created (one per workflow stage)`);
}

async function main() {
  console.log("Seeding FixItNow…");
  await seedCategories();
  await seedAdmin();
  const customer = await upsertUser({ ...DEMO_CUSTOMER, role: Role.CUSTOMER });
  const technician = await seedDemoTechnician();
  await seedDemoBookings(customer.id, technician.id);
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
