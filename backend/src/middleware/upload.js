import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { config } from '../config/env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = path.join(__dirname, '..', '..', config.uploadDir)
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const cleanExt = path.extname(file.originalname).toLowerCase()
    const baseName = path
      .basename(file.originalname, cleanExt)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50)
    cb(null, `${baseName}-${uniqueSuffix}${cleanExt}`)
  },
})

// File filter whitelist
const allowedExtensions = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.zip',
  '.rar',
]

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowedExtensions.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error(`File type ${ext} is not allowed. Supported formats: PDF, Word, PowerPoint, Excel, text, images, and archives.`))
  }
}

// 25MB maximum file size
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
})
