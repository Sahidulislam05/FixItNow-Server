# FixItNow 🔧

**Your Trusted Home Service Platform** — a backend API for a home services marketplace where customers book qualified technicians for plumbing, electrical, cleaning, and other home services.

🔗 **Live API:** [https://fix-it-now-bd.vercel.app](https://fix-it-now-bd.vercel.app)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Database Schema](#-database-schema)
- [Booking Lifecycle](#-booking-lifecycle)
- [API Endpoints](#-api-endpoints)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Testing the API](#-testing-the-api)
- [Payment Integration (SSLCommerz)](#-payment-integration-sslcommerz)
- [Deployment](#-deployment)
- [Admin Credentials](#-admin-credentials)
- [Available Scripts](#-available-scripts)

---

## 🧭 Overview

FixItNow connects three types of users:

| Role           | Description                                                                                |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Customer**   | Browses services, books technicians, pays via SSLCommerz, tracks bookings, leaves reviews  |
| **Technician** | Manages profile & availability, offers services, accepts/declines bookings, completes jobs |
| **Admin**      | Manages users, oversees all bookings, moderates service categories                         |

Users select their role at registration (Customer or Technician — Admin accounts are seeded, not self-registered).

---

## ✨ Features

**Public**

- Browse services & technicians with filtering, search, and pagination
- View technician profiles with ratings and reviews

**Customer**

- Register/login, manage profile
- Book a technician for a specific service
- Pay via SSLCommerz after the technician accepts
- Track booking status, cancel before work starts
- Leave a review after job completion

**Technician**

- Manage profile (bio, experience, skills) and weekly availability
- Create/update/deactivate services
- Accept/decline bookings, mark jobs in-progress/completed

**Admin**

- View & ban/unban users
- View all bookings across the platform
- Manage service categories

---

## 🛠️ Tech Stack

| Layer               | Technology                                                             |
| ------------------- | ---------------------------------------------------------------------- |
| Runtime / Framework | Node.js, Express 5, TypeScript                                         |
| Database / ORM      | PostgreSQL (NeonDB), Prisma 7 with `@prisma/adapter-pg` driver adapter |
| Auth                | JWT (access + refresh tokens), bcryptjs                                |
| Validation          | Zod                                                                    |
| Payment             | SSLCommerz (sandbox)                                                   |
| Deployment          | Vercel (serverless)                                                    |

---

## 🏗️ Project Architecture

Modular, layered architecture — every feature is a self-contained module following `route → controller → service`:

```
fixitnow-backend/
├── api/
│   └── index.js              # Vercel serverless entry (wraps the compiled Express app)
├── prisma/
│   ├── schema/                # Multi-file Prisma schema (8 entities + enums)
│   ├── migrations/
│   └── seed.ts                # Seeds categories, admin and demo accounts/bookings
├── src/
│   ├── app.ts                 # Express app setup, route mounting
│   ├── server.ts              # Local dev server bootstrap
│   ├── config/                # Environment variable loader
│   ├── lib/                   # prisma.ts, sslcommerz.ts
│   ├── middlewares/            # auth, validateRequest, error handlers
│   ├── utils/                  # catchAsync, sendResponse, jwt, AppError
│   └── modules/
│       ├── auth/               # login, refresh-token
│       ├── user/               # register, profile
│       ├── category/
│       ├── technician/         # profile, availability, public listing
│       ├── service/
│       ├── booking/            # create, status transitions, cancel
│       ├── payment/             # SSLCommerz integration
│       ├── review/
│       └── admin/               # user management, platform oversight
├── docs/                        # Deployment guide, QA checklist, video script
├── FixItNow.postman_collection.json
└── vercel.json
```

Every request flows through: `route → validateRequest (Zod) → auth (JWT + role guard) → controller → service → Prisma`. Errors are caught centrally by `globalErrorHandler` and always return the same shape:

```json
{
  "success": false,
  "message": "Human readable message",
  "errorDetails": { "statusCode": 400, "name": "...", "issues": [...] }
}
```

---

## 🗄️ Database Schema

8 entities modeled in Prisma:

| Model                    | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `User`                   | Customers, technicians, and admins (role-based) |
| `TechnicianProfile`      | Bio, experience, skills, aggregated rating      |
| `TechnicianAvailability` | Weekly availability slots                       |
| `Category`               | Service categories (Plumbing, Electrical, etc.) |
| `Service`                | A specific service offered by a technician      |
| `Booking`                | A booking between a customer and technician     |
| `Payment`                | SSLCommerz payment transactions                 |
| `Review`                 | Customer reviews for completed bookings         |

---

## 🔄 Booking Lifecycle

```
REQUESTED ──accept──> ACCEPTED ──pay (SSLCommerz)──> PAID ──start──> IN_PROGRESS ──> COMPLETED
    └──decline──> DECLINED

Customer can CANCEL from REQUESTED / ACCEPTED / PAID — not once IN_PROGRESS has started.
```

Transitions are enforced by a state-machine guard (`booking.constant.ts`) — invalid jumps (e.g. `REQUESTED → COMPLETED`, or manually setting `PAID`) are rejected with a `400`.

---

## 📡 API Endpoints

Full request/response examples are in [`FixItNow.postman_collection.json`](./FixItNow.postman_collection.json). Summary:

| Module                  | Endpoints                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**                | `POST /api/auth/login` · `POST /api/auth/refresh-token`                                                                                                       |
| **User**                | `POST /api/users/register` · `GET /api/users/me` · `PUT /api/users/my-profile` · `PATCH /api/users/me/password`                                               |
| **Category**            | `GET/POST /api/categories` · `GET/PATCH /api/categories/:id`                                                                                                  |
| **Technician (public)** | `GET /api/technicians` · `GET /api/technicians/:id`                                                                                                           |
| **Technician (self)**   | `PUT /api/technician/profile` · `PUT/GET /api/technician/availability`                                                                                        |
| **Service**             | `POST/GET /api/services` · `GET /api/services/my-services` · `GET/PATCH/DELETE /api/services/:id`                                                             |
| **Booking**             | `POST/GET /api/bookings` · `GET /api/bookings/:id` · `PATCH /api/bookings/:id/cancel` · `GET /api/technician/bookings` · `PATCH /api/technician/bookings/:id` |
| **Payment**             | `POST /api/payments/create` · `POST /api/payments/confirm` · `GET /api/payments` · `GET /api/payments/:id`                                                    |
| **Review**              | `POST /api/reviews` · `GET /api/reviews/recent` (public)                                                                                                      |
| **Contact**             | `POST /api/contact` (public) · `GET /api/contact` (admin)                                                                                                     |
| **Admin**               | `GET /api/admin/users` · `PATCH /api/admin/users/:id` · `GET /api/admin/bookings` · `GET/POST /api/admin/categories`                                          |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (e.g. [NeonDB](https://neon.tech), free tier)

### Installation

```bash
git clone https://github.com/Sahidulislam05/FixItNow
cd FixItNow
npm install
cp .env.example .env
# .env এ DATABASE_URL, JWT secrets, SSLCommerz credentials বসাও
```

### Database Setup

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed        # categories, admin, demo customer/technician + bookings
```

### Run Locally

```bash
npm run dev
```

Server runs at `http://localhost:5000`.

---

## 🔐 Environment Variables

| Key                                                   | Description                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `PORT`                                                | Local dev port (default `5000`)                                                        |
| `DATABASE_URL`                                        | PostgreSQL connection string (use NeonDB's **pooled** URL in production)               |
| `APP_URL`                                             | Base URL of this API — used for CORS and SSLCommerz callback URLs                      |
| `NODE_ENV`                                            | `development` / `production`                                                           |
| `BCRYPT_SALT_ROUNDS`                                  | Password hashing cost factor                                                           |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`            | JWT signing secrets                                                                    |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`    | Token lifetimes (e.g. `1d`, `7d`)                                                      |
| `SSL_COMMERZ_STORE_ID` / `SSL_COMMERZ_STORE_PASSWORD` | From your [SSLCommerz sandbox account](https://developer.sslcommerz.com/registration/) |
| `SSL_COMMERZ_IS_LIVE`                                 | `false` for sandbox                                                                    |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`                      | Seeded admin credentials                                                               |

See `.env.example` for a ready-to-copy template.

---

## 🧪 Testing the API

1. Import [`FixItNow.postman_collection.json`](./FixItNow.postman_collection.json) into Postman
2. Set the `baseUrl` collection variable to `https://fix-it-now-bd.vercel.app` (or `http://localhost:5000` locally)
3. Run folders in order (01 → 10) — login requests auto-save tokens, creation requests auto-save IDs, so the whole customer → technician → admin journey runs end-to-end
4. See [`docs/QA_CHECKLIST.md`](./docs/QA_CHECKLIST.md) for the full manual test walkthrough

---

## 💳 Payment Integration (SSLCommerz)

1. Customer books a service → technician accepts (`status: ACCEPTED`)
2. Customer calls `POST /api/payments/create` → gets a `gatewayPageURL`
3. Customer completes payment on SSLCommerz's sandbox checkout page
4. SSLCommerz calls `POST /api/payments/confirm` — the server verifies the transaction **server-to-server** using `val_id` (not just trusting the redirect) before marking `Payment` and `Booking` as `PAID`

Get free sandbox credentials at [developer.sslcommerz.com/registration](https://developer.sslcommerz.com/registration/) (choose "Sandbox").

---

## ☁️ Deployment

Deployed on Vercel. Since Prisma's client generator outputs raw TypeScript and Vercel's zero-config detection didn't reliably resolve module imports, this project pre-compiles with `tsc` and serves a plain CommonJS entry (`api/index.js`) — see [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the full guide, including environment variable setup and troubleshooting.

```bash
npm run build       # compiles src/ → dist/
vercel --prod        # or push to a Git-connected Vercel project
```

---

## 👤 Demo Accounts

`npm run seed` creates everything needed to walk through the full marketplace workflow. It is safe to run more than once.

| Role       | Email                     | Password                                               |
| ---------- | ------------------------- | ------------------------------------------------------ |
| Customer   | `customer@fixitnow.com`   | `customer123` (override with `DEMO_CUSTOMER_PASSWORD`)   |
| Technician | `technician@fixitnow.com` | `technician123` (override with `DEMO_TECHNICIAN_PASSWORD`) |
| Admin      | `ADMIN_EMAIL`             | `ADMIN_PASSWORD`                                       |

The demo technician gets a profile, weekly hours and three services. The demo customer gets one booking in **every** stage — requested, accepted, paid, in progress, completed (unreviewed) and completed (reviewed) — so each dashboard action can be tried immediately. Passwords of the accounts in `DEMO_LOCKED_EMAILS` cannot be changed through the API.

After pulling these changes, apply the new `contact_messages` migration before seeding:

```bash
npx prisma migrate deploy
npm run seed
```

---

## 📜 Available Scripts

| Script          | Description                                          |
| --------------- | ---------------------------------------------------- |
| `npm run dev`   | Start local dev server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript → `dist/`                         |
| `npm start`     | Run the compiled build (`node dist/server.js`)       |
| `npm run seed`  | Seed categories, admin and the demo marketplace data |

---

## 👤 Author

**Sahidul Islam**  
GitHub: [@Sahidulislam05](https://github.com/Sahidulislam05)
