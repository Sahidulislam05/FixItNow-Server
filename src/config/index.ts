import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV || "development",
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  app_url: process.env.APP_URL,
  frontend_url: process.env.FRONTEND_URL,
  cors_origins: process.env.CORS_ORIGINS,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET!,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET!,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN!,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN!,
  ssl_commerz_store_id: process.env.SSL_COMMERZ_STORE_ID!,
  ssl_commerz_store_passwd: process.env.SSL_COMMERZ_STORE_PASSWORD!,
  ssl_commerz_is_live: process.env.SSL_COMMERZ_IS_LIVE === "true",
  admin_email: process.env.ADMIN_EMAIL,
  admin_password: process.env.ADMIN_PASSWORD,
};
