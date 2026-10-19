import { Router } from 'express'
import { checkDatabaseConnection } from '../config/prisma.js'

const router = Router()

router.get('/', async (req, res) => {
  const dbStatus = await checkDatabaseConnection()

  res.status(200).json({
    status: 'ok',
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
