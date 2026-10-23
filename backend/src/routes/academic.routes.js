import { Router } from 'express'
import fs from 'fs/promises'
import prisma from '../config/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { uploadMiddleware } from '../middleware/upload.js'
import path from 'path'

const router = Router()

// Get all subjects and resources (public or authenticated)
router.get('/courses', async (req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        resources: {
          include: {
            uploader: {
              select: { id: true, fullName: true, department: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { code: 'asc' },
    })

    res.json({ courses: subjects })
  } catch (error) {
    next(error)
  }
})

// Faculty upload academic resource (PDF/notes)
router.post('/upload', authenticate, (req, res, next) => {
  if (req.user.role !== 'FACULTY' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only faculty members can upload academic vault materials.' })
  }
  next()
}, uploadMiddleware.single('file'), async (req, res, next) => {
  try {
    const { title, description, category = 'NOTES', subjectId } = req.body
    const uploader = req.user

    if (!title?.trim() || title.trim().length > 200 || !subjectId || !req.file) {
      if (req.file) await fs.unlink(req.file.path)
      return res.status(400).json({ error: 'A title under 200 characters, subject, and resource file are required.' })
    }

    const extension = path.extname(req.file.originalname).toLowerCase()
    if (!['.pdf', '.doc', '.docx', '.ppt', '.pptx'].includes(extension)) {
      await fs.unlink(req.file.path)
      return res.status(400).json({ error: 'Academic resources must be PDF, Word, or PowerPoint files.' })
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } })
    if (!subject) {
      await fs.unlink(req.file.path)
      return res.status(404).json({ error: 'The selected course was not found.' })
    }

    const fileUrl = `/uploads/${req.file.filename}`
    const fileSize = `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`
    const fileFormat = path.extname(req.file.originalname).slice(1).toUpperCase()

    const resource = await prisma.academicResource.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        category: category.toUpperCase(),
        fileUrl,
        fileFormat,
        fileSize,
        subjectId,
        uploaderId: uploader.id,
      },
      include: {
        uploader: {
          select: { id: true, fullName: true, department: true, role: true },
        },
      },
    })

    res.status(201).json({ resource })
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch((cleanupError) => {
        console.error('Failed to remove an academic upload after an error:', cleanupError.message)
      })
    }
    next(error)
  }
})

// Increment download count
router.post('/resources/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params
    const resource = await prisma.academicResource.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    })

    res.json({ downloads: resource.downloads })
  } catch (error) {
    next(error)
  }
})

export default router
