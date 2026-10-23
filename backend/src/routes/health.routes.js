import { Router } from 'express'
import { checkDatabaseConnection } from '../config/prisma.js'

const router = Router()

router.get('/', async (req, res) => {
  const dbStatus = await checkDatabaseConnection()
  const statusCode = dbStatus.connected ? 200 : 503

  res.status(statusCode).json({
    status: dbStatus.connected ? 'ok' : 'degraded',
    service: 'College Connect API',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())} seconds`,
    database: {
      status: dbStatus.connected ? 'connected' : 'disconnected',
      error: dbStatus.error,
    },
  })
})

export default router
