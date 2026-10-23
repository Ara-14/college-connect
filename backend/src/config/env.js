import dotenv from 'dotenv'

dotenv.config()

const nodeEnv = process.env.NODE_ENV || 'development'
const databaseUrl = process.env.DATABASE_URL || (
  nodeEnv === 'development'
    ? 'postgresql://postgres:postgres@localhost:5432/collegeconnect?schema=public'
    : undefined
)

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl
}

const configuredFreeToTalkRateLimit = Number.parseInt(
  process.env.FREE_TO_TALK_MESSAGE_RATE_LIMIT_SECONDS || '5',
  10
)

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv,
  databaseUrl,
  jwtSecret: process.env.JWT_SECRET || 'collegeconnect_dev_secret_key_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  freeToTalkMessageRateLimitSeconds: Number.isFinite(configuredFreeToTalkRateLimit)
    ? Math.min(60, Math.max(1, configuredFreeToTalkRateLimit))
    : 5,
}
