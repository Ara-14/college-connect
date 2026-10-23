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
      auth: { token: localStorage.getItem('cc_auth_token') },
    })

    socket.on('connect', () => {
      console.log('⚡ Socket connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason)
    })
  }
  return socket
}

export const connectSocket = () => {
  const s = getSocket()
  s.auth = { token: localStorage.getItem('cc_auth_token') }
  if (!s.connected) {
    s.connect()
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

export const emitTypingStart = (conversationId) => {
  const s = getSocket()
  if (s && s.connected && conversationId) {
    s.emit('typing_start', { conversationId })
  }
}

export const emitTypingStop = (conversationId) => {
  const s = getSocket()
  if (s && s.connected && conversationId) {
    s.emit('typing_stop', { conversationId })
  }
}
