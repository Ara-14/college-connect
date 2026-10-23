import { Router } from 'express'
import fs from 'fs'
import prisma from '../config/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { imageUploadMiddleware, isSupportedImageUpload } from '../middleware/upload.js'

const router = Router()

// Helper: Format post output for frontend
const formatPost = (post, currentUserId = null) => {
  const isLiked = currentUserId
    ? (post.likes || []).some((l) => l.userId === currentUserId)
    : false
  const isSaved = currentUserId
    ? (post.savedBy || []).some((s) => s.userId === currentUserId)
    : false

  const primaryMedia = post.media && post.media.length > 0 ? post.media[0].mediaUrl : null

  // Human readable time
  const timeDiff = Date.now() - new Date(post.createdAt).getTime()
  let timeStr = 'Just now'
  const minutes = Math.floor(timeDiff / (1000 * 60))
  const hours = Math.floor(timeDiff / (1000 * 60 * 60))
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

  if (days > 0) {
    timeStr = days === 1 ? '1 day ago' : `${days} days ago`
  } else if (hours > 0) {
    timeStr = hours === 1 ? '1 hour ago' : `${hours} hours ago`
  } else if (minutes > 0) {
    timeStr = minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  }

  return {
    id: post.id,
    userId: post.userId,
    user: post.user?.fullName || 'College Student',
    username: post.user?.username || 'student',
    avatar: post.user?.avatarUrl || '',
    userRole: post.user?.role || 'STUDENT',
    userDepartment: post.user?.department || '',
    location: post.location || 'College Connect Campus',
    caption: post.caption || '',
    image: primaryMedia,
    media: post.media || [],
    likes: post._count?.likes ?? post.likes?.length ?? 0,
    liked: isLiked,
    saved: isSaved,
    time: timeStr,
    createdAt: post.createdAt,
    comments: (post.comments || []).map((c) => ({
      id: c.id,
      userId: c.userId,
      user: c.user?.fullName || c.user?.username || 'Student',
      username: c.user?.username || '',
      avatar: c.user?.avatarUrl || '',
      userRole: c.user?.role || 'STUDENT',
      text: c.content,
      createdAt: c.createdAt,
    })),
  }
}

// -------------------------------------------------------------
// 1. GET ALL POSTS (FEED - NEWEST FIRST)
// -------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    // Optional auth check from header for like/saved flags
    let currentUserId = null
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = await import('jsonwebtoken')
        const { config } = await import('../config/env.js')
        const token = authHeader.split(' ')[1]
        const decoded = jwt.default.verify(token, config.jwtSecret)
        currentUserId = decoded.userId
      } catch {
        // Unauthenticated request is allowed for public feed
      }
    }

    const posts = await prisma.post.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            role: true,
            department: true,
          },
        },
        media: {
          orderBy: { position: 'asc' },
        },
        likes: {
          select: { userId: true },
        },
        savedBy: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { userId: true },
            }
          : false,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                username: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    })

    const formattedPosts = posts.map((p) => formatPost(p, currentUserId))
    res.json({ posts: formattedPosts })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 2. CREATE A POST (AUTHENTICATED WITH OPTIONAL IMAGE UPLOAD)
// -------------------------------------------------------------
router.post('/', authenticate, imageUploadMiddleware.single('image'), async (req, res, next) => {
  try {
    const { caption, location } = req.body
    const userId = req.user.id

    if (req.file && !isSupportedImageUpload(req.file)) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ error: 'The selected file is not a valid JPG, JPEG, PNG, or WebP image.' })
    }

    const trimmedCaption = caption ? caption.trim() : ''
    const hasImage = Boolean(req.file)

    if (!trimmedCaption && !hasImage) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
      return res.status(400).json({ error: 'Please add a caption or an image to create a post.' })
    }

    let mediaData = undefined
    if (hasImage) {
      const mediaUrl = `/uploads/${req.file.filename}`
      mediaData = {
        create: [
          {
            mediaUrl,
            mediaType: 'IMAGE',
            position: 0,
          },
        ],
      }
    }

    const post = await prisma.post.create({
      data: {
        userId,
        caption: trimmedCaption,
        location: location?.trim() || req.user.department || 'College Connect Campus',
        media: mediaData,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            department: true,
            role: true,
          },
        },
        media: true,
        likes: { select: { userId: true } },
        savedBy: { where: { userId }, select: { userId: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, fullName: true, username: true, avatarUrl: true, role: true },
            },
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    })

    res.status(201).json({
      success: true,
      post: formatPost(post, userId),
      message: 'Post created successfully!',
    })
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (cleanupError) {
        console.error('Failed to remove an unassociated post image:', cleanupError.message)
      }
    }
    next(error)
  }
})

// -------------------------------------------------------------
// 3. TOGGLE LIKE ON A POST
// -------------------------------------------------------------
router.post('/:id/like', authenticate, async (req, res, next) => {
  try {
    const postId = req.params.id
    const userId = req.user.id

    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' })
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    })

    let liked = false
    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      })
      liked = false
    } else {
      await prisma.like.create({
        data: {
          userId,
          postId,
        },
      })
      liked = true

      // Send notification to post author if not self
      if (post.userId !== userId) {
        try {
          await prisma.notification.create({
            data: {
              recipientId: post.userId,
              actorId: userId,
              type: 'LIKE',
              title: 'New Like',
              message: `${req.user.fullName} liked your post.`,
              entityId: postId,
            },
          })
        } catch {
          // ignore notification failure
        }
      }
    }

    const likesCount = await prisma.like.count({ where: { postId } })
    res.json({ liked, likesCount })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 4. ADD COMMENT TO A POST
// -------------------------------------------------------------
router.post('/:id/comment', authenticate, async (req, res, next) => {
  try {
    const postId = req.params.id
    const userId = req.user.id
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' })
    }

    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' })
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    })

    // Send notification to post author if not self
    if (post.userId !== userId) {
      try {
        await prisma.notification.create({
          data: {
            recipientId: post.userId,
            actorId: userId,
            type: 'COMMENT',
            title: 'New Comment',
            message: `${req.user.fullName} commented on your post: "${content.trim().slice(0, 50)}"`,
            entityId: postId,
          },
        })
      } catch {
        // ignore notification failure
      }
    }

    res.status(201).json({
      comment: {
        id: comment.id,
        userId: comment.userId,
        user: comment.user.fullName,
        username: comment.user.username,
        avatar: comment.user.avatarUrl,
        userRole: comment.user.role,
        text: comment.content,
        createdAt: comment.createdAt,
      },
    })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 5. TOGGLE SAVE POST
// -------------------------------------------------------------
router.post('/:id/save', authenticate, async (req, res, next) => {
  try {
    const postId = req.params.id
    const userId = req.user.id

    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' })
    }

    const existingSave = await prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    })

    let saved = false
    if (existingSave) {
      await prisma.savedPost.delete({ where: { id: existingSave.id } })
      saved = false
    } else {
      await prisma.savedPost.create({
        data: {
          userId,
          postId,
        },
      })
      saved = true
    }

    res.json({ saved })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 6. DELETE POST
// -------------------------------------------------------------
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const postId = req.params.id
    const userId = req.user.id

    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' })
    }

    if (post.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You are not authorized to delete this post.' })
    }

    await prisma.post.delete({ where: { id: postId } })
    res.json({ success: true, message: 'Post deleted successfully.' })
  } catch (error) {
    next(error)
  }
})

export default router
