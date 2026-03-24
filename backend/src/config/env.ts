import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL', 'file:./prisma/dev.db'),
  JWT_SECRET: requireEnv('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production'),
  PORT: parseInt(process.env.PORT || '3001', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  ADMIN_FEE_DEFAULT: parseFloat(process.env.ADMIN_FEE_DEFAULT || '10'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  UPLOADS_DIR: path.resolve(__dirname, '../../uploads'),
};

export default env;
