import prisma from '../config/prisma.js'
import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map()

export const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Authentication required.'))
      const decoded = jwt.verify(token, config.jwtSecret)
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, fullName: true },
      })
      if (!user) return next(new Error('Authentication required.'))
      socket.data.user = user
      next()
    } catch {
      next(new Error('Authentication failed.'))
    }
  })

  io.on('connection', (socket) => {
    const currentUserId = socket.data.user.id

    if (!onlineUsers.has(currentUserId)) {
      onlineUsers.set(currentUserId, new Set())
    }
    onlineUsers.get(currentUserId).add(socket.id)
    socket.join(currentUserId)

    prisma.user.update({
      where: { id: currentUserId },
      data: { status: 'ONLINE', lastSeenAt: new Date() },
    }).catch((error) => {
      console.error('Failed to update connected user presence:', error.message)
    })

    socket.on('join_conversation', async (conversationId) => {
      if (typeof conversationId !== 'string') return
      try {
        const membership = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: { conversationId, userId: currentUserId },
          },
          include: { conversation: { select: { freeToTalkKey: true } } },
        })
        if (!membership) return
        if (membership.conversation.freeToTalkKey === 'FREE_TO_TALK' &&
          membership.acceptedPolicyVersion !== '2026-10-23-v1') return
        socket.join(conversationId)
      } catch (error) {
        console.error('Failed to authorize conversation socket join:', error.message)
      }
    })

    socket.on('leave_conversation', (conversationId) => {
      if (typeof conversationId === 'string') {
        socket.leave(conversationId)
      }
    })

    socket.on('typing_start', async (payload) => {
      const conversationId = payload?.conversationId
      if (typeof conversationId !== 'string' || !socket.rooms.has(conversationId)) return
      try {
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { freeToTalkKey: true },
        })
        socket.to(conversationId).emit('user_typing', conversation?.freeToTalkKey === 'FREE_TO_TALK'
          ? { conversationId, userId: null, userName: 'A member' }
          : { conversationId, userId: currentUserId, userName: socket.data.user.fullName })
      } catch (error) {
        console.error('Failed to process typing event:', error.message)
      }
    })

    socket.on('typing_stop', (payload) => {
      const conversationId = payload?.conversationId
      if (typeof conversationId !== 'string' || !socket.rooms.has(conversationId)) return
      socket.to(conversationId).emit('user_stopped_typing', {
        conversationId,
        userId: null,
      })
    })

    socket.on('disconnect', async () => {
      if (currentUserId && onlineUsers.has(currentUserId)) {
        const userSockets = onlineUsers.get(currentUserId)
        userSockets.delete(socket.id)

        if (userSockets.size === 0) {
          onlineUsers.delete(currentUserId)

          // Update database status to OFFLINE
          try {
            await prisma.user.update({
              where: { id: currentUserId },
              data: { status: 'OFFLINE', lastSeenAt: new Date() },
            })
          } catch (err) {
            // Ignore background presence update failures
          }
        }
      }

    })
  })
}
