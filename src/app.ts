import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import config from "./config";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import { notFound } from "./middlewares/notFound";
import { authRoutes } from "./modules/auth/auth.route";
import { adminRoutes } from "./modules/admin/admin.route";
import {
  bookingRoutes,
  technicianBookingRoutes,
} from "./modules/booking/booking.route";
import { categoryRoutes } from "./modules/category/category.route";
import { paymentRoutes } from "./modules/payment/payment.route";
import { reviewRoutes } from "./modules/review/review.route";
import { serviceRoutes } from "./modules/service/service.route";
import {
  technicianRoutes,
  technicianSelfRoutes,
} from "./modules/technician/technician.route";
import { userRoutes } from "./modules/user/user.route";

const app: Application = express();

const defaultOrigins = [
  "http://localhost:3000",
  "https://fix-it-now-delta.vercel.app",
];

const envOrigins = [config.cors_origins, config.frontend_url]
  .filter(Boolean)
  .flatMap((item) => (item as string).split(","))
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const sslCommerzOrigins = [
  "https://sandbox.sslcommerz.com",
  "https://securepay.sslcommerz.com",
  "https://sslcommerz.com",
];
app.use(
  cors({
    origin: function (origin, callback) {
      const normalizedOrigin = origin?.replace(/\/$/, "");
      if (
        !normalizedOrigin ||
        allowedOrigins.includes(normalizedOrigin) ||
        sslCommerzOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.endsWith(".sslcommerz.com") ||
        normalizedOrigin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("FixItNow API is running!");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/technician/bookings", technicianBookingRoutes);
app.use("/api/technician", technicianSelfRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);

app.use(globalErrorHandler);

export default app;
