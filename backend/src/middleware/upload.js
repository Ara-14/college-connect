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

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  if (imageExtensions.has(ext) && imageMimeTypes.has(file.mimetype)) {
    cb(null, true)
    return
  }

  const error = new Error('Please upload a JPG, JPEG, PNG, or WebP image.')
  error.statusCode = 400
  cb(error)
}

export const imageUploadMiddleware = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})

export const isSupportedImageUpload = (file) => {
  if (!file) return false

  const ext = path.extname(file.originalname).toLowerCase()
  const signature = Buffer.alloc(12)
  let fileDescriptor

  try {
    fileDescriptor = fs.openSync(file.path, 'r')
    const bytesRead = fs.readSync(fileDescriptor, signature, 0, signature.length, 0)

    if (ext === '.jpg' || ext === '.jpeg') {
      return file.mimetype === 'image/jpeg' &&
        bytesRead >= 3 &&
        signature[0] === 0xff &&
        signature[1] === 0xd8 &&
        signature[2] === 0xff
    }

    if (ext === '.png') {
      return file.mimetype === 'image/png' &&
        bytesRead >= 8 &&
        signature.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    }

    if (ext === '.webp') {
      return file.mimetype === 'image/webp' &&
        bytesRead >= 12 &&
        signature.toString('ascii', 0, 4) === 'RIFF' &&
        signature.toString('ascii', 8, 12) === 'WEBP'
    }

    return false
  } finally {
    if (fileDescriptor !== undefined) fs.closeSync(fileDescriptor)
  }
}

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
  '.webm',
  '.ogg',
  '.mp3',
  '.wav',
  '.m4a',
  '.zip',
  '.rar',
]
const audioMimeTypesByExtension = {
  '.webm': ['audio/webm'],
  '.ogg': ['audio/ogg', 'application/ogg'],
  '.mp3': ['audio/mpeg', 'audio/mp3'],
  '.wav': ['audio/wav', 'audio/x-wav', 'audio/wave'],
  '.m4a': ['audio/mp4', 'audio/m4a', 'audio/x-m4a'],
}
const imageMimeTypesByExtension = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.gif': ['image/gif'],
}

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  const audioMimeTypes = audioMimeTypesByExtension[ext]
  const normalizedMimeType = file.mimetype.split(';', 1)[0]
  const imageMimeTypes = imageMimeTypesByExtension[ext]
  if ((audioMimeTypes && !audioMimeTypes.includes(normalizedMimeType)) ||
    (imageMimeTypes && !imageMimeTypes.includes(normalizedMimeType))) {
    cb(new Error('The selected media file type does not match its file extension.'))
  } else if (allowedExtensions.includes(ext)) {
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
