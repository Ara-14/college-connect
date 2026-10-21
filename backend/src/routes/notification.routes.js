import { Router } from 'express'
import prisma from '../config/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// Get all notifications for current user
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id

    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    })

    const unreadCount = await prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    })

    res.json({ notifications, unreadCount })
  } catch (error) {
    next(error)
  }
})

// Mark single notification as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const updated = await prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true },
    })

    res.json({ success: true, count: updated.count })
  } catch (error) {
    next(error)
  }
})

// Mark all notifications as read
router.post('/read-all', async (req, res, next) => {
  try {
    const userId = req.user.id

    await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    })

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// Delete notification
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    await prisma.notification.deleteMany({
      where: { id, recipientId: userId },
    })

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
