import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: process.env.ENV_FILE || fileURLToPath(new URL('../../.env', import.meta.url)) });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  dbPath: process.env.DB_PATH || 'database/research-lifecycle-manager.sqlite',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'rlm_session',
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
  sessionDays: Number(process.env.SESSION_DAYS || 7),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  secureCookies: process.env.SECURE_COOKIES === 'true'
};
