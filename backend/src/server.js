import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Server as SocketIOServer } from 'socket.io'
import app from './app.js'
import { config } from './config/env.js'
import prisma from './config/prisma.js'
import { initSocket } from './socket/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure upload directory exists
const uploadDirectory = path.join(__dirname, '..', config.uploadDir)
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true })
}

const server = http.createServer(app)

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      config.clientUrl,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173',
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
})

// Attach io instance to app for access in routes/controllers
app.set('io', io)

// Initialize comprehensive socket handlers
initSocket(io)

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
