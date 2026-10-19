import { PrismaClient } from '@prisma/client'
import { config } from './env.js'

let prisma

if (config.nodeEnv === 'production') {
  prisma = new PrismaClient()
} else {
  // Prevent multiple instances of Prisma Client in development with hot reload
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    })
  }
  prisma = global.__prisma
}

export const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { connected: true, error: null }
  } catch (error) {
    return { connected: false, error: error.message }
  }
}

export default prisma
