import { io } from 'socket.io-client'
import { SOCKET_URL } from './api.js'

let socket = null

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      withCredentials: true,
    })

    socket.on('connect', () => {
      console.log('⚡ Socket connected:', socket.id)
      const storedUser = localStorage.getItem('cc_auth_user')
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser)
          socket.emit('register_user', user.id)
        } catch (e) {
          // ignore
        }
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason)
    })
  }
  return socket
}

export const connectSocket = (user) => {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
  if (user && user.id) {
    s.emit('register_user', user.id)
  }
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const joinConversationRoom = (conversationId) => {
  const s = getSocket()
  if (s && s.connected && conversationId) {
    s.emit('join_conversation', conversationId)
  }
}

export const leaveConversationRoom = (conversationId) => {
  const s = getSocket()
  if (s && s.connected && conversationId) {
    s.emit('leave_conversation', conversationId)
  }
}

export const emitTypingStart = (conversationId, user) => {
  const s = getSocket()
  if (s && s.connected && conversationId && user) {
    s.emit('typing_start', {
      conversationId,
      userId: user.id,
      userName: user.fullName,
    })
  }
}

export const emitTypingStop = (conversationId, user) => {
  const s = getSocket()
  if (s && s.connected && conversationId && user) {
    s.emit('typing_stop', {
      conversationId,
      userId: user.id,
    })
  }
}
