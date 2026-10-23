import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import prisma from '../config/prisma.js'
import { config } from '../config/env.js'
import { authenticate } from '../middleware/auth.js'
import { imageUploadMiddleware, isSupportedImageUpload } from '../middleware/upload.js'

const router = Router()

const generateToken = (userId) => {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}

// Register user
router.post('/register', async (req, res, next) => {
  try {
    const {
      email,
      username,
      fullName,
      password,
      role = 'STUDENT',
      department = 'Computer Science & Engineering',
      semester = '5th Sem',
      section = 'Section A',
      yearOfStudy = '3rd Year',
      rollNumber = '',
      bio = '',
      avatarUrl = '',
      officeHours = '',
    } = req.body

    if (!email || !username || !fullName || !password) {
      return res.status(400).json({ error: 'Email, username, fullName, and password are required.' })
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
      },
    })

    if (existingUser) {
      return res.status(400).json({
        error: existingUser.email === email.toLowerCase()
          ? 'An account with this email already exists.'
          : 'This username is already taken.',
      })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        username: username.toLowerCase().trim(),
        fullName: fullName.trim(),
        passwordHash,
        role: role.toUpperCase() === 'FACULTY' ? 'FACULTY' : 'STUDENT',
        department: department.trim(),
        semester: semester.trim(),
        section: section.trim(),
        yearOfStudy: yearOfStudy.trim(),
        rollNumber: rollNumber.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl || (role === 'FACULTY'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'),
        officeHours: officeHours.trim(),
        allowStudentDMs: true,
        status: 'ONLINE',
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        department: true,
        semester: true,
        section: true,
        yearOfStudy: true,
        rollNumber: true,
        bio: true,
        avatarUrl: true,
        allowStudentDMs: true,
        status: true,
        officeHours: true,
        createdAt: true,
      },
    })

    const token = generateToken(user.id)
    return res.status(201).json({ token, user })
  } catch (error) {
    next(error)
  }
})

// Login user
router.post('/login', async (req, res, next) => {
  try {
    const { login, password } = req.body

    if (!login || !password) {
      return res.status(400).json({ error: 'Please enter your email or username and password.' })
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: login.toLowerCase().trim() },
          { username: login.toLowerCase().trim() },
        ],
      },
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' })
    }

    // Update status to ONLINE and lastSeenAt
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ONLINE', lastSeenAt: new Date() },
    })

    const token = generateToken(user.id)

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      semester: user.semester,
      section: user.section,
      yearOfStudy: user.yearOfStudy,
      rollNumber: user.rollNumber,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      allowStudentDMs: user.allowStudentDMs,
      status: 'ONLINE',
      officeHours: user.officeHours,
    }

    return res.json({ token, user: sanitizedUser })
  } catch (error) {
    next(error)
  }
})

// Current user profile
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user })
})

// Update user profile / settings
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const { bio, allowStudentDMs, officeHours, status, avatarUrl, department, semester, section } = req.body

    const updateData = {}
    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.length > 500) {
        return res.status(400).json({ error: 'Bio must be 500 characters or fewer.' })
      }
      updateData.bio = bio.trim()
    }
    if (allowStudentDMs !== undefined) updateData.allowStudentDMs = Boolean(allowStudentDMs)
    if (officeHours !== undefined) updateData.officeHours = officeHours
    if (status !== undefined) updateData.status = status
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
    if (department !== undefined) updateData.department = department
    if (semester !== undefined) updateData.semester = semester
    if (section !== undefined) updateData.section = section

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        department: true,
        semester: true,
        section: true,
        yearOfStudy: true,
        rollNumber: true,
        bio: true,
        avatarUrl: true,
        allowStudentDMs: true,
        status: true,
        officeHours: true,
      },
    })

    res.json({ user: updatedUser })
  } catch (error) {
    next(error)
  }
})

// Upload & change profile picture (avatar)
router.post('/avatar', authenticate, imageUploadMiddleware.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image file to upload.' })
    }

    if (!isSupportedImageUpload(req.file)) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
      return res.status(400).json({ error: 'The selected file is not a valid JPG, JPEG, PNG, or WebP image.' })
    }

    const avatarUrl = `/uploads/${req.file.filename}`

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        department: true,
        semester: true,
        section: true,
        yearOfStudy: true,
        rollNumber: true,
        bio: true,
        avatarUrl: true,
        allowStudentDMs: true,
        status: true,
        officeHours: true,
      },
    })

    res.json({
      success: true,
      user: updatedUser,
      avatarUrl: updatedUser.avatarUrl,
      message: 'Profile picture updated successfully.',
    })
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (cleanupError) {
        console.error('Failed to remove an unassociated profile image:', cleanupError.message)
      }
    }
    next(error)
  }
})

// Directory: Search and filter users (faculty and students)
router.get('/users', authenticate, async (req, res, next) => {
  try {
    const { role, department, semester, section, search } = req.query

    const where = {}

    if (role) {
      where.role = role.toUpperCase()
    }

    if (department && department !== 'All') {
      where.department = { contains: department, mode: 'insensitive' }
    }

    if (semester && semester !== 'All') {
      where.semester = semester
    }

    if (section && section !== 'All') {
      where.section = section
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { rollNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        department: true,
        semester: true,
        section: true,
        rollNumber: true,
        bio: true,
        avatarUrl: true,
        allowStudentDMs: true,
        status: true,
        officeHours: true,
        lastSeenAt: true,
      },
      orderBy: [
        { role: 'asc' }, // FACULTY first, then STUDENT
        { fullName: 'asc' },
      ],
    })

    res.json({ users })
  } catch (error) {
    next(error)
  }
})

export default router
