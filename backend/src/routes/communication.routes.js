import { Router } from 'express'
import path from 'path'
import prisma from '../config/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { uploadMiddleware } from '../middleware/upload.js'

const router = Router()

// All communication routes require authentication
router.use(authenticate)

// Helper to determine attachment file type
const getAttachmentType = (mimeType, originalName) => {
  const ext = path.extname(originalName).toLowerCase()
  if (mimeType.startsWith('image/')) return 'IMAGE'
  if (ext === '.pdf' || mimeType.includes('pdf')) return 'PDF'
  if (['.doc', '.docx', '.txt', '.ppt', '.pptx', '.xls', '.xlsx'].includes(ext)) return 'DOC'
  return 'FILE'
}

// -------------------------------------------------------------
// 1. GET ALL CONVERSATIONS FOR CURRENT USER
// -------------------------------------------------------------
router.get('/conversations', async (req, res, next) => {
  try {
    const userId = req.user.id

    // Fetch all conversation memberships for the current user
    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    username: true,
                    avatarUrl: true,
                    role: true,
                    department: true,
                    semester: true,
                    section: true,
                    allowStudentDMs: true,
                    status: true,
                    officeHours: true,
                    lastSeenAt: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: { id: true, fullName: true, role: true },
                },
                attachments: true,
              },
            },
            pinnedMessage: {
              include: {
                sender: { select: { id: true, fullName: true, role: true } },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    })

    // Compute unread message counts and shape response
    const conversations = await Promise.all(
      memberships.map(async (m) => {
        const conv = m.conversation
        const lastReadAt = m.lastReadAt || m.joinedAt

        // Count unread messages sent by others after lastReadAt
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            createdAt: { gt: lastReadAt },
            isDeleted: false,
          },
        })

        // Identify the other participant for 1-to-1 direct chats
        let otherMember = null
        if (conv.type === 'DIRECT' || conv.type === 'QUERY') {
          const other = conv.members.find((member) => member.userId !== userId)
          if (other) {
            otherMember = other.user
          }
        }

        return {
          id: conv.id,
          title: conv.title,
          description: conv.description,
          type: conv.type,
          department: conv.department,
          semester: conv.semester,
          section: conv.section,
          subject: conv.subject,
          isFacultyOnly: conv.isFacultyOnly,
          isReadOnly: conv.isReadOnly,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          myMembership: {
            role: m.role,
            isMuted: m.isMuted,
            isArchived: m.isArchived,
            lastReadAt: m.lastReadAt,
          },
          members: conv.members.map((member) => ({
            ...member.user,
            memberRole: member.role,
            isMuted: member.isMuted,
          })),
          otherMember,
          latestMessage: conv.messages[0] || null,
          pinnedMessage: conv.pinnedMessage || null,
          unreadCount,
        }
      })
    )

    res.json({ conversations })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 2. CREATE OR RETRIEVE 1-TO-1 DIRECT CHAT
// -------------------------------------------------------------
router.post('/conversations/direct', async (req, res, next) => {
  try {
    const { recipientId, subject, queryCategory } = req.body
    const sender = req.user

    if (!recipientId) {
      return res.status(400).json({ error: 'recipientId is required.' })
    }

    if (recipientId === sender.id) {
      return res.status(400).json({ error: 'Cannot start a direct conversation with yourself.' })
    }

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        fullName: true,
        role: true,
        department: true,
        allowStudentDMs: true,
      },
    })

    if (!recipient) {
      return res.status(404).json({ error: 'User not found.' })
    }

    // Check block list
    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: sender.id, blockedId: recipient.id },
          { blockerId: recipient.id, blockedId: sender.id },
        ],
      },
    })

    if (isBlocked) {
      return res.status(403).json({ error: 'Communication with this user is blocked.' })
    }

    // COMMUNICATION PERMISSIONS:
    // If Student -> Faculty, check if faculty allows direct student messages
    if (sender.role === 'STUDENT' && recipient.role === 'FACULTY') {
      if (!recipient.allowStudentDMs) {
        return res.status(403).json({
          error: `${recipient.fullName} has currently restricted incoming direct messages from students. Please post your inquiry in the class announcement discussion or attend their scheduled office hours.`,
          dmsRestricted: true,
        })
      }
    }

    // Check if a direct conversation already exists between these two users
    const existingMembership = await prisma.conversationMember.findFirst({
      where: {
        userId: sender.id,
        conversation: {
          type: queryCategory ? 'QUERY' : 'DIRECT',
          members: {
            some: { userId: recipientId },
          },
        },
      },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    username: true,
                    avatarUrl: true,
                    role: true,
                    department: true,
                    allowStudentDMs: true,
                    status: true,
                    officeHours: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (existingMembership) {
      return res.json({ conversation: existingMembership.conversation })
    }

    // Create new direct or academic query conversation
    const isQuery = Boolean(queryCategory || (sender.role === 'STUDENT' && recipient.role === 'FACULTY'))
    const convTitle = isQuery ? `Academic Query: ${subject || 'General'}` : null

    const newConv = await prisma.conversation.create({
      data: {
        type: isQuery ? 'QUERY' : 'DIRECT',
        title: convTitle,
        subject: subject || null,
        createdById: sender.id,
        members: {
          create: [
            { userId: sender.id, role: 'ADMIN' },
            { userId: recipient.id, role: 'MEMBER' },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                username: true,
                avatarUrl: true,
                role: true,
                department: true,
                allowStudentDMs: true,
                status: true,
                officeHours: true,
              },
            },
          },
        },
      },
    })

    // Notify recipient via Socket.IO if online
    const io = req.app.get('io')
    if (io) {
      io.to(recipientId).emit('conversation_created', newConv)
    }

    res.status(201).json({ conversation: newConv })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 3. CREATE GROUP OR ANNOUNCEMENT CHANNEL
// -------------------------------------------------------------
router.post('/conversations/group', async (req, res, next) => {
  try {
    const {
      title,
      description,
      type = 'GROUP', // 'GROUP' or 'ANNOUNCEMENT'
      isFacultyOnly = false,
      isReadOnly = false,
      department,
      semester,
      section,
      subject,
      memberIds = [],
    } = req.body

    const user = req.user

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Group title is required.' })
    }

    // PERMISSION CHECKS:
    // 1. Only Faculty can create faculty-only groups
    if (isFacultyOnly && user.role !== 'FACULTY' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only faculty members can create faculty-only groups.' })
    }

    // 2. Only Faculty can create official Announcement channels
    if (type === 'ANNOUNCEMENT' && user.role !== 'FACULTY' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only faculty members can create official announcement channels.' })
    }

    // 3. If group is faculty-only, verify all initial members are faculty
    if (isFacultyOnly && memberIds.length > 0) {
      const studentMembers = await prisma.user.findMany({
        where: {
          id: { in: memberIds },
          role: 'STUDENT',
        },
      })
      if (studentMembers.length > 0) {
        return res.status(400).json({
          error: `Cannot add students to a faculty-only group (${studentMembers.map((s) => s.fullName).join(', ')}).`,
        })
      }
    }

    // Ensure creator is in the members list
    const uniqueMemberIds = Array.from(new Set([...memberIds, user.id]))

    const newGroup = await prisma.conversation.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        type: type.toUpperCase() === 'ANNOUNCEMENT' ? 'ANNOUNCEMENT' : 'GROUP',
        isFacultyOnly: Boolean(isFacultyOnly),
        isReadOnly: type === 'ANNOUNCEMENT' ? true : Boolean(isReadOnly),
        department: department || user.department,
        semester: semester || null,
        section: section || null,
        subject: subject || null,
        createdById: user.id,
        members: {
          create: uniqueMemberIds.map((id) => ({
            userId: id,
            role: id === user.id ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                username: true,
                avatarUrl: true,
                role: true,
                department: true,
                status: true,
              },
            },
          },
        },
      },
    })

    // Broadcast creation to members via Socket.IO
    const io = req.app.get('io')
    if (io) {
      uniqueMemberIds.forEach((mId) => {
        io.to(mId).emit('conversation_created', newGroup)
      })
    }

    res.status(201).json({ conversation: newGroup })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 4. GET CONVERSATION DETAILS
// -------------------------------------------------------------
router.get('/conversations/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    username: true,
                    avatarUrl: true,
                    role: true,
                    department: true,
                    semester: true,
                    section: true,
                    allowStudentDMs: true,
                    status: true,
                    officeHours: true,
                    lastSeenAt: true,
                  },
                },
              },
            },
            pinnedMessage: {
              include: {
                sender: { select: { id: true, fullName: true, role: true } },
                attachments: true,
              },
            },
          },
        },
      },
    })

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' })
    }

    const conv = membership.conversation

    res.json({
      conversation: {
        ...conv,
        myMembership: {
          role: membership.role,
          isMuted: membership.isMuted,
          isArchived: membership.isArchived,
          lastReadAt: membership.lastReadAt,
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 5. UPDATE CONVERSATION (METADATA OR USER PREFERENCES)
// -------------------------------------------------------------
router.patch('/conversations/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const { title, description, isMuted, isArchived } = req.body

    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
    })

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' })
    }

    // Update user's membership preferences
    if (isMuted !== undefined || isArchived !== undefined) {
      await prisma.conversationMember.update({
        where: { id: membership.id },
        data: {
          ...(isMuted !== undefined && { isMuted: Boolean(isMuted) }),
          ...(isArchived !== undefined && { isArchived: Boolean(isArchived) }),
        },
      })
    }

    // Update group title/description (Admin or Faculty only)
    if (title !== undefined || description !== undefined) {
      if (membership.role !== 'ADMIN' && req.user.role !== 'FACULTY') {
        return res.status(403).json({ error: 'Only group administrators or faculty can edit conversation details.' })
      }

      await prisma.conversation.update({
        where: { id },
        data: {
          ...(title && { title: title.trim() }),
          ...(description !== undefined && { description: description.trim() }),
        },
      })
    }

    res.json({ message: 'Conversation updated successfully.' })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 6. ADD MEMBERS TO GROUP
// -------------------------------------------------------------
router.post('/conversations/:id/members', async (req, res, next) => {
  try {
    const { id } = req.params
    const { userIds = [] } = req.body

    if (!userIds.length) {
      return res.status(400).json({ error: 'userIds array is required.' })
    }

    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId: req.user.id },
      },
      include: { conversation: true },
    })

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' })
    }

    if (membership.role !== 'ADMIN' && req.user.role !== 'FACULTY') {
      return res.status(403).json({ error: 'Only admins or faculty can add members.' })
    }

    if (membership.conversation.isFacultyOnly) {
      const studentMembers = await prisma.user.findMany({
        where: { id: { in: userIds }, role: 'STUDENT' },
      })
      if (studentMembers.length > 0) {
        return res.status(400).json({ error: 'Cannot add students to a faculty-only group.' })
      }
    }

    for (const uid of userIds) {
      await prisma.conversationMember.upsert({
        where: {
          conversationId_userId: { conversationId: id, userId: uid },
        },
        update: {},
        create: {
          conversationId: id,
          userId: uid,
          role: 'MEMBER',
        },
      })
    }

    res.json({ message: 'Members added successfully.' })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 7. GET MESSAGES FOR A CONVERSATION
// -------------------------------------------------------------
router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const { limit = 50, before } = req.query

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
    })

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' })
    }

    const where = {
      conversationId: id,
      ...(before && { createdAt: { lt: new Date(before) } }),
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit, 10),
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            role: true,
            department: true,
          },
        },
        attachments: true,
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, fullName: true } },
          },
        },
        readReceipts: {
          select: {
            userId: true,
            readAt: true,
          },
        },
      },
    })

    res.json({ messages })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 8. SEND MESSAGE (WITH OPTIONAL ATTACHMENTS & REPLIES)
// -------------------------------------------------------------
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params
    const sender = req.user
    const { content, messageType = 'TEXT', replyToId, queryCategory, attachments = [] } = req.body

    if ((!content || !content.trim()) && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message must have content or attachments.' })
    }

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId: sender.id },
      },
      include: { conversation: true },
    })

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' })
    }

    // Check if conversation is read-only (Announcement channel)
    if (membership.conversation.isReadOnly && sender.role !== 'FACULTY' && sender.role !== 'ADMIN') {
      return res.status(403).json({ error: 'This is a broadcast announcement channel. Only faculty can post messages.' })
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: sender.id,
        content: content ? content.trim() : (attachments.length ? `Shared ${attachments.length} attachment(s)` : ''),
        messageType: attachments.length > 0 ? (attachments[0].fileType === 'IMAGE' ? 'IMAGE' : 'FILE') : messageType,
        replyToId: replyToId || null,
        queryCategory: queryCategory || null,
        attachments: {
          create: attachments.map((att) => ({
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileType: att.fileType || 'FILE',
            fileSize: att.fileSize || null,
            mimeType: att.mimeType || null,
          })),
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            role: true,
            department: true,
          },
        },
        attachments: true,
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, fullName: true } },
          },
        },
        readReceipts: true,
      },
    })

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    // Mark as read for sender
    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    })

    // Generate in-app notifications for other participants
    const otherMembers = await prisma.conversationMember.findMany({
      where: {
        conversationId: id,
        userId: { not: sender.id },
        isMuted: false,
      },
    })

    const notifTitle = membership.conversation.type === 'DIRECT'
      ? `New message from ${sender.fullName}`
      : `${sender.fullName} in ${membership.conversation.title || 'Group'}`

    for (const m of otherMembers) {
      await prisma.notification.create({
        data: {
          recipientId: m.userId,
          actorId: sender.id,
          type: membership.conversation.type === 'ANNOUNCEMENT' ? 'ANNOUNCEMENT' : 'MESSAGE',
          title: notifTitle,
          message: content ? (content.length > 80 ? `${content.slice(0, 77)}...` : content) : 'Sent an attachment',
          entityId: id,
        },
      })
    }

    // Real-time broadcast via Socket.IO
    const io = req.app.get('io')
    if (io) {
      io.to(id).emit('new_message', message)
      // Also notify members' personal rooms to update conversation list badges
      otherMembers.forEach((m) => {
        io.to(m.userId).emit('conversation_updated', {
          conversationId: id,
          latestMessage: message,
        })
      })
    }

    res.status(201).json({ message })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 9. EDIT MESSAGE
// -------------------------------------------------------------
router.patch('/messages/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { content } = req.body
    const userId = req.user.id

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' })
    }

    const message = await prisma.message.findUnique({
      where: { id },
      include: { conversation: true },
    })

    if (!message) {
      return res.status(404).json({ error: 'Message not found.' })
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages.' })
    }

    if (message.isDeleted) {
      return res.status(400).json({ error: 'Cannot edit a deleted message.' })
    }

    const updated = await prisma.message.update({
      where: { id },
      data: {
        content: content.trim(),
        isEdited: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            role: true,
            department: true,
          },
        },
        attachments: true,
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, fullName: true } },
          },
        },
      },
    })

    const io = req.app.get('io')
    if (io) {
      io.to(message.conversationId).emit('message_edited', updated)
    }

    res.json({ message: updated })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 10. DELETE MESSAGE
// -------------------------------------------------------------
router.delete('/messages/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            members: { where: { userId } },
          },
        },
      },
    })

    if (!message) {
      return res.status(404).json({ error: 'Message not found.' })
    }

    const userMembership = message.conversation.members[0]
    const isAuthor = message.senderId === userId
    const isAdmin = userMembership?.role === 'ADMIN' || req.user.role === 'FACULTY'

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to delete this message.' })
    }

    // Soft delete to maintain thread integrity
    const deleted = await prisma.message.update({
      where: { id },
      data: {
        isDeleted: true,
        content: 'This message was deleted.',
      },
    })

    const io = req.app.get('io')
    if (io) {
      io.to(message.conversationId).emit('message_deleted', {
        messageId: id,
        conversationId: message.conversationId,
      })
    }

    res.json({ message: 'Message deleted successfully.', id })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 11. PIN / UNPIN MESSAGE
// -------------------------------------------------------------
router.post('/messages/:id/pin', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            members: { where: { userId } },
          },
        },
      },
    })

    if (!message) {
      return res.status(404).json({ error: 'Message not found.' })
    }

    const newPinnedStatus = !message.isPinned

    await prisma.message.update({
      where: { id },
      data: { isPinned: newPinnedStatus },
    })

    await prisma.conversation.update({
      where: { id: message.conversationId },
      data: {
        pinnedMessageId: newPinnedStatus ? id : null,
      },
    })

    const io = req.app.get('io')
    if (io) {
      io.to(message.conversationId).emit('message_pinned', {
        messageId: id,
        conversationId: message.conversationId,
        isPinned: newPinnedStatus,
      })
    }

    res.json({ message: `Message ${newPinnedStatus ? 'pinned' : 'unpinned'} successfully.` })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 12. MARK CONVERSATION AS READ
// -------------------------------------------------------------
router.post('/conversations/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
    })

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' })
    }

    // Update member's lastReadAt
    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    })

    // Find all unread messages from others
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId: id,
        senderId: { not: userId },
      },
      select: { id: true },
    })

    // Create read receipts
    for (const msg of unreadMessages) {
      await prisma.messageReadReceipt.upsert({
        where: {
          messageId_userId: { messageId: msg.id, userId },
        },
        update: { readAt: new Date() },
        create: {
          messageId: msg.id,
          userId,
          readAt: new Date(),
        },
      })
    }

    const io = req.app.get('io')
    if (io) {
      io.to(id).emit('messages_read', {
        conversationId: id,
        userId,
        readAt: new Date(),
      })
    }

    res.json({ success: true, conversationId: id })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 13. FILE ATTACHMENT UPLOAD
// -------------------------------------------------------------
router.post('/upload', uploadMiddleware.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' })
    }

    const fileUrl = `/uploads/${req.file.filename}`
    const mimeType = req.file.mimetype
    const originalName = req.file.originalname
    const fileType = getAttachmentType(mimeType, originalName)
    const fileSize = `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`

    res.status(201).json({
      fileUrl,
      fileName: originalName,
      fileType,
      fileSize: req.file.size < 1024 * 1024 ? `${Math.round(req.file.size / 1024)} KB` : fileSize,
      mimeType,
    })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 14. REPORT MESSAGE FOR MODERATION
// -------------------------------------------------------------
router.post('/messages/:id/report', async (req, res, next) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const userId = req.user.id

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Please provide a reason for reporting this message.' })
    }

    const report = await prisma.messageReport.create({
      data: {
        messageId: id,
        reportedById: userId,
        reason: reason.trim(),
        status: 'PENDING',
      },
    })

    res.status(201).json({ message: 'Thank you. The message has been flagged for administrative review.', report })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 15. BLOCK / UNBLOCK USER
// -------------------------------------------------------------
router.post('/users/:id/block', async (req, res, next) => {
  try {
    const targetUserId = req.params.id
    const userId = req.user.id

    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Cannot block yourself.' })
    }

    const existingBlock = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId: targetUserId },
      },
    })

    if (existingBlock) {
      await prisma.userBlock.delete({
        where: { id: existingBlock.id },
      })
      return res.json({ blocked: false, message: 'User unblocked successfully.' })
    }

    await prisma.userBlock.create({
      data: {
        blockerId: userId,
        blockedId: targetUserId,
      },
    })

    res.json({ blocked: true, message: 'User blocked successfully.' })
  } catch (error) {
    next(error)
  }
})

export default router
