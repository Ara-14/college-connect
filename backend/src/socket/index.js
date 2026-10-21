import prisma from '../config/prisma.js'

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map()

export const initSocket = (io) => {
  io.on('connection', (socket) => {
    let currentUserId = null

    // Register active user
    socket.on('register_user', async (userId) => {
      if (!userId) return
      currentUserId = userId

      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set())
      }
      onlineUsers.get(userId).add(socket.id)

      // Join user's personal room for direct notifications
      socket.join(userId)

      // Broadcast updated online list
      io.emit('online_users', Array.from(onlineUsers.keys()))

      // Update database status
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { status: 'ONLINE', lastSeenAt: new Date() },
        })
      } catch (err) {
        // Ignore background presence update failures
      }
    })

    // Join a conversation room (e.g. when opening a chat window)
    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(conversationId)
      }
    })

    // Leave a conversation room
    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(conversationId)
      }
    })

    // Typing indicators
    socket.on('typing_start', ({ conversationId, userId, userName }) => {
      if (conversationId) {
        socket.to(conversationId).emit('user_typing', {
          conversationId,
          userId,
          userName,
        })
      }
    })

    socket.on('typing_stop', ({ conversationId, userId }) => {
      if (conversationId) {
        socket.to(conversationId).emit('user_stopped_typing', {
          conversationId,
          userId,
        })
      }
    })

    // Handle user disconnect
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

      io.emit('online_users', Array.from(onlineUsers.keys()))
    })
  })
}
