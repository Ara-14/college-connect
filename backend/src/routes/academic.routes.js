import { Router } from 'express'
import prisma from '../config/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { uploadMiddleware } from '../middleware/upload.js'

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
router.post('/upload', authenticate, uploadMiddleware.single('file'), async (req, res, next) => {
  try {
    const { title, description, category = 'NOTES', subjectId } = req.body
    const uploader = req.user

    if (!title || !subjectId) {
      return res.status(400).json({ error: 'Title and subjectId are required.' })
    }

    if (uploader.role !== 'FACULTY' && uploader.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only faculty members can upload academic vault materials.' })
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : '/uploads/sample_notes.pdf'
    const fileSize = req.file ? `${(req.file.size / (1024 * 1024)).toFixed(1)} MB` : '2.5 MB'
    const fileFormat = req.file?.originalname.endsWith('.pdf') ? 'PDF' : 'DOC'

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
