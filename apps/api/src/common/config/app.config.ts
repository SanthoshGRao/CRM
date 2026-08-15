import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  cookieSecret: process.env.COOKIE_SECRET || 'change-this-secret-in-production',

  cookie: {
    // 'lax' keeps the refresh cookie working across the dev ports and on
    // top-level returns to the app. Deployments that serve the web app from a
    // different site than the API need 'none' (which forces Secure).
    sameSite: (process.env.COOKIE_SAMESITE || 'lax').toLowerCase() as 'lax' | 'strict' | 'none',
    domain: process.env.COOKIE_DOMAIN || undefined,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

    // Platform-admin tokens are signed with their own secret so a customer
    // token can never be replayed against the admin API (and vice versa).
    platformSecret: process.env.JWT_PLATFORM_SECRET || 'platform-secret-change-me',
    platformExpiresIn: process.env.JWT_PLATFORM_EXPIRES_IN || '8h',
  },

  // Self-service signup is off: customer companies are provisioned by staff.
  allowPublicRegistration: process.env.ALLOW_PUBLIC_REGISTRATION === 'true',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'CRM Platform <noreply@crm.local>',
  },

  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    localPath: process.env.LOCAL_STORAGE_PATH || './uploads',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    bucket: process.env.S3_BUCKET || 'crm-files',
    region: process.env.S3_REGION || 'us-east-1',
  },
}));
