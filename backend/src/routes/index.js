import { Router } from 'express'
import healthRoutes from './health.routes.js'
import authRoutes from './auth.routes.js'
import communicationRoutes from './communication.routes.js'
import notificationRoutes from './notification.routes.js'
import academicRoutes from './academic.routes.js'

const apiRouter = Router()

// API Sub-routers
apiRouter.use('/health', healthRoutes)
apiRouter.use('/auth', authRoutes)
apiRouter.use('/communication', communicationRoutes)
apiRouter.use('/notifications', notificationRoutes)
apiRouter.use('/academic', academicRoutes)

export default apiRouter
