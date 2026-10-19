import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Server as SocketIOServer } from 'socket.io'
import app from './app.js'
import { config } from './config/env.js'
import prisma from './config/prisma.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure upload directory exists
const uploadDirectory = path.join(__dirname, '..', config.uploadDir)
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true })
}

const server = http.createServer(app)

// Initialize Socket.IO for future real-time direct messaging and notifications
const io = new SocketIOServer(server, {
  cors: {
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Store connected sockets
const onlineUsers = new Map() // userId -> socketId

io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`)

  socket.on('register_user', (userId) => {
    onlineUsers.set(userId, socket.id)
    io.emit('online_users', Array.from(onlineUsers.keys()))
  })

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId)
        break
      }
    }
    io.emit('online_users', Array.from(onlineUsers.keys()))
    console.log(`[Socket] User disconnected: ${socket.id}`)
  })
})

// Attach io instance to app for access in routes/controllers if needed
app.set('io', io)

const PORT = config.port

server.listen(PORT, () => {
  console.log(`===============================================`)
  console.log(`  🎓 College Connect API Server Running`)
  console.log(`  🚀 Port:        ${PORT}`)
  console.log(`  🌐 Environment: ${config.nodeEnv}`)
  console.log(`  🏥 HealthCheck: http://localhost:${PORT}/api/health`)
  console.log(`===============================================`)
})

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`)
  server.close(async () => {
    console.log('HTTP and Socket server closed.')
    try {
      await prisma.$disconnect()
      console.log('Database disconnected.')
    } catch (err) {
      console.error('Error disconnecting database:', err)
    }
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
