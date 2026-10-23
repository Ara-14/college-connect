import { Router } from 'express'
import healthRoutes from './health.routes.js'
import authRoutes from './auth.routes.js'
import communicationRoutes from './communication.routes.js'
import notificationRoutes from './notification.routes.js'
import academicRoutes from './academic.routes.js'
import postRoutes from './post.routes.js'
import communityRoutes from './community.routes.js'
import aiRoutes from './ai.routes.js'

const apiRouter = Router()

// API Sub-routers
apiRouter.use('/health', healthRoutes)
apiRouter.use('/auth', authRoutes)
apiRouter.use('/communication', communicationRoutes)
apiRouter.use('/notifications', notificationRoutes)
apiRouter.use('/academic', academicRoutes)
apiRouter.use('/posts', postRoutes)
apiRouter.use('/communities', communityRoutes)
apiRouter.use('/ai', aiRoutes)

export default apiRouter
