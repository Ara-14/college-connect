import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import prisma from '../config/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { isSupportedImageUpload, uploadMiddleware } from '../middleware/upload.js'
import { MESSAGE_TAGS, normalizeMessageTags } from '../constants/messageTags.js'
import { config } from '../config/env.js'
import {
  FREE_TO_TALK_POLICY_VERSION,
  FREE_TO_TALK_NOTICE,
  FREE_TO_TALK_REPORT_CATEGORIES,
  FREE_TO_TALK_TAGS,
  isFreeToTalkModerator,
} from '../constants/freeToTalk.js'

const router = Router()

const publicAnonymousMessage = (message, viewerId) => ({
  ...message,
  senderId: message.senderId === viewerId ? viewerId : null,
  sender: { fullName: 'Anonymous member', avatarUrl: null },
  attachments: [],
  readReceipts: undefined,
  replyTo: message.replyTo
    ? message.replyTo.isHidden || message.replyTo.isDeleted
      ? {
          id: message.replyTo.id,
          content: 'This message is unavailable.',
          sender: { fullName: 'Anonymous member' },
        }
      : {
        ...message.replyTo,
        senderId: undefined,
        sender: { fullName: 'Anonymous member' },
      }
    : null,
})

const ensureFreeToTalkMembership = async (user) => {
  if (!['STUDENT', 'FACULTY', 'ADMIN'].includes(user.role)) return null
  let conversation = await prisma.conversation.findUnique({
    where: { freeToTalkKey: 'FREE_TO_TALK' },
  })
  if (!conversation) {
    try {
      conversation = await prisma.conversation.create({
        data: {
          freeToTalkKey: 'FREE_TO_TALK',
          title: 'Free to Talk!!',
          description: 'An anonymous, college-wide community discussion group.',
          type: 'GROUP',
          messageRateLimitSeconds: config.freeToTalkMessageRateLimitSeconds,
          reportReviewHours: 48,
          createdById: user.id,
          members: { create: { userId: user.id, role: 'MEMBER' } },
        },
      })
      return conversation
    } catch (error) {
      if (error.code !== 'P2002') throw error
      conversation = await prisma.conversation.findUnique({
        where: { freeToTalkKey: 'FREE_TO_TALK' },
      })
    }
  }

  if (conversation) {
    await prisma.conversationMember.upsert({
      where: {
        conversationId_userId: { conversationId: conversation.id, userId: user.id },
      },
      update: {},
      create: { conversationId: conversation.id, userId: user.id, role: 'MEMBER' },
    })
  }
  return conversation
}

const shapeFreeToTalkConversation = (conversation, membership, viewerId) => {
  const safeMessage = (message) => message && !message.isHidden
    ? publicAnonymousMessage(message, viewerId)
    : null
  const hasAcceptedPolicy = membership.acceptedPolicyVersion === FREE_TO_TALK_POLICY_VERSION
  return {
    id: conversation.id,
    title: 'Free to Talk!!',
    description: 'An anonymous, college-wide community discussion group.',
    type: 'GROUP',
    isFreeToTalk: true,
    policyNotice: FREE_TO_TALK_NOTICE,
    memberCount: conversation.members?.length,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    myMembership: {
      role: membership.role,
      isMuted: membership.isMuted,
      isArchived: membership.isArchived,
      lastReadAt: membership.lastReadAt,
      hasAcceptedPolicy,
      messagingRestrictedUntil: membership.messagingRestrictedUntil,
    },
    members: [],
    latestMessage: hasAcceptedPolicy ? safeMessage(conversation.messages?.[0]) : null,
    pinnedMessage: hasAcceptedPolicy ? safeMessage(conversation.pinnedMessage) : null,
    unreadCount: hasAcceptedPolicy ? conversation.unreadCount || 0 : 0,
  }
}

// All communication routes require authentication
router.use(authenticate)

// Helper to determine attachment file type
const getAttachmentType = (mimeType, originalName) => {
  const ext = path.extname(originalName).toLowerCase()
  if (mimeType.startsWith('audio/')) return 'AUDIO'
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
    await ensureFreeToTalkMembership(req.user)

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
            ...(conv.freeToTalkKey === 'FREE_TO_TALK' && { isHidden: false }),
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

        const conversationShape = {
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
        if (conv.freeToTalkKey === 'FREE_TO_TALK') {
          return shapeFreeToTalkConversation(
            { ...conv, unreadCount },
            m,
            userId
          )
        }
        return conversationShape
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
    if (membership.conversation.freeToTalkKey === 'FREE_TO_TALK' &&
      membership.acceptedPolicyVersion !== FREE_TO_TALK_POLICY_VERSION) {
      return res.status(428).json({ error: 'Accept the Free to Talk safety notice before viewing this conversation.' })
    }

    const conv = membership.conversation

    if (conv.freeToTalkKey === 'FREE_TO_TALK') {
      return res.json({
        conversation: shapeFreeToTalkConversation(conv, membership, userId),
      })
    }

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
      include: { conversation: { select: { freeToTalkKey: true } } },
    })

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' })
    }

    if (membership.conversation.freeToTalkKey === 'FREE_TO_TALK' &&
      (title !== undefined || description !== undefined)) {
      return res.status(403).json({ error: 'Free to Talk settings are managed by system administrators.' })
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

router.post('/conversations/:id/free-to-talk/accept-policy', async (req, res, next) => {
  try {
    const { id } = req.params
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId: req.user.id },
      },
      include: { conversation: { select: { freeToTalkKey: true } } },
    })
    if (!membership || membership.conversation.freeToTalkKey !== 'FREE_TO_TALK') {
      return res.status(404).json({ error: 'Free to Talk group not found.' })
    }

    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { acceptedPolicyVersion: FREE_TO_TALK_POLICY_VERSION },
    })
    res.json({ accepted: true, policyVersion: FREE_TO_TALK_POLICY_VERSION })
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

    if (membership.conversation.freeToTalkKey === 'FREE_TO_TALK' &&
      req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only system administrators may manage Free to Talk membership.' })
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
    const { limit = 50, before, tag, search } = req.query

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
    })

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' })
    }
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { freeToTalkKey: true },
    })
    const isFreeToTalk = conversation?.freeToTalkKey === 'FREE_TO_TALK'
    if (isFreeToTalk && membership.acceptedPolicyVersion !== FREE_TO_TALK_POLICY_VERSION) {
      return res.status(428).json({ error: 'Accept the Free to Talk safety notice before viewing messages.' })
    }

    const filters = []
    let normalizedTag
    if (tag !== undefined) {
      if (typeof tag !== 'string') {
        return res.status(400).json({ error: 'Tag filter must be a single tag.' })
      }
      normalizedTag = tag.replace(/^#/, '').trim().toLowerCase()
      if (!MESSAGE_TAGS.includes(normalizedTag)) {
        return res.status(400).json({ error: 'Unsupported message tag.' })
      }
      filters.push({ tags: { has: normalizedTag } })
    }

    if (search !== undefined) {
      if (typeof search !== 'string') {
        return res.status(400).json({ error: 'Search must be text.' })
      }
      const searchText = search.trim()
      if (searchText) {
        const searchTag = searchText.match(/^#([a-z][a-z0-9_-]{0,31})$/i)?.[1]?.toLowerCase()
        filters.push({
          OR: [
            { content: { contains: searchText, mode: 'insensitive' } },
            ...(!isFreeToTalk ? [
              { sender: { is: { fullName: { contains: searchText, mode: 'insensitive' } } } },
              { sender: { is: { username: { contains: searchText, mode: 'insensitive' } } } },
              { conversation: { is: { title: { contains: searchText, mode: 'insensitive' } } } },
              { conversation: { is: { subject: { contains: searchText, mode: 'insensitive' } } } },
            ] : []),
            ...(searchTag && MESSAGE_TAGS.includes(searchTag)
              ? [{ tags: { has: searchTag } }]
              : []),
          ],
        })
      }
    }

    const parsedLimit = Number.parseInt(limit, 10)
    const where = {
      conversationId: id,
      ...(isFreeToTalk && { isHidden: false }),
      ...(filters.length > 0 && { AND: filters }),
      ...(before && { createdAt: { lt: new Date(before) } }),
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50,
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
            isHidden: true,
            isDeleted: true,
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

    if (!isFreeToTalk) return res.json({ messages })
    res.json({
      messages: messages.map((message) => publicAnonymousMessage(
        message.isHidden
          ? { ...message, content: 'This message is hidden pending moderation.', attachments: [] }
          : message,
        userId
      )),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/conversations/:id/message-tag-counts', async (req, res, next) => {
  try {
    const { id } = req.params
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId: req.user.id },
      },
    })

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' })
    }
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { freeToTalkKey: true },
    })
    if (conversation?.freeToTalkKey === 'FREE_TO_TALK' &&
      membership.acceptedPolicyVersion !== FREE_TO_TALK_POLICY_VERSION) {
      return res.status(428).json({ error: 'Accept the Free to Talk safety notice before viewing tags.' })
    }

    const counts = await prisma.$queryRaw`
      SELECT unnested.tag, COUNT(*)::int AS count
      FROM "Message"
      CROSS JOIN UNNEST("tags") AS unnested(tag)
      WHERE "conversationId" = ${id} AND "isDeleted" = false AND "isHidden" = false
      GROUP BY unnested.tag
    `
    const tagCounts = Object.fromEntries(MESSAGE_TAGS.map((tag) => [tag, 0]))
    const isFreeToTalk = conversation?.freeToTalkKey === 'FREE_TO_TALK'
    counts.forEach(({ tag, count }) => {
      if (MESSAGE_TAGS.includes(tag) && (!isFreeToTalk || FREE_TO_TALK_TAGS.has(tag))) tagCounts[tag] = count
    })
    res.json({ tagCounts })
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
    const {
      content,
      tags: providedTags = [],
      messageType = 'TEXT',
      replyToId,
      queryCategory,
      attachments = [],
    } = req.body
    const messageContent = typeof content === 'string' ? content.trim() : ''

    if (!Array.isArray(attachments)) {
      return res.status(400).json({ error: 'Attachments must be an array.' })
    }
    if (!messageContent && attachments.length === 0) {
      return res.status(400).json({ error: 'Message must have content or attachments.' })
    }

    const { tags, error: tagError } = normalizeMessageTags(
      providedTags,
      messageContent
    )
    if (tagError) return res.status(400).json({ error: tagError })

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
    const isFreeToTalk = membership.conversation.freeToTalkKey === 'FREE_TO_TALK'
    if (isFreeToTalk) {
      if (membership.acceptedPolicyVersion !== FREE_TO_TALK_POLICY_VERSION) {
        return res.status(428).json({ error: 'Accept the Free to Talk safety notice before posting.' })
      }
      if (attachments.length > 0) {
        return res.status(400).json({ error: 'Attachments are disabled in Free to Talk to help protect member privacy.' })
      }
      if (messageType !== 'TEXT') {
        return res.status(400).json({ error: 'Free to Talk supports text messages only.' })
      }
      if (tags.some((messageTag) => !FREE_TO_TALK_TAGS.has(messageTag))) {
        return res.status(400).json({ error: 'Free to Talk supports #doubt, #help, #academic, #feedback, and #general.' })
      }
      if (messageContent.length > 2000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(messageContent)) {
        return res.status(400).json({ error: 'Message must be plain text under 2,000 characters.' })
      }
      if (membership.messagingRestrictedUntil && membership.messagingRestrictedUntil > new Date()) {
        return res.status(403).json({
          error: `Messaging is temporarily restricted until ${membership.messagingRestrictedUntil.toISOString()}.`,
        })
      }
      const now = Date.now()
      const waitMs = membership.conversation.messageRateLimitSeconds * 1000
      const duplicate = await prisma.message.findFirst({
        where: {
          conversationId: id,
          senderId: sender.id,
          content: messageContent,
          createdAt: { gte: new Date(now - 60_000) },
        },
        select: { id: true },
      })
      if (duplicate) {
        return res.status(429).json({ error: 'Repeated messages are limited to reduce spam.' })
      }
      const rateLimitReservation = await prisma.conversationMember.updateMany({
        where: {
          id: membership.id,
          OR: [
            { lastMessageAt: null },
            { lastMessageAt: { lte: new Date(now - waitMs) } },
          ],
        },
        data: { lastMessageAt: new Date(now) },
      })
      if (rateLimitReservation.count === 0) {
        return res.status(429).json({ error: 'Please wait before sending another message.' })
      }
    }
    if (replyToId) {
      const replyTarget = await prisma.message.findUnique({
        where: { id: replyToId },
        select: { conversationId: true, isHidden: true, isDeleted: true },
      })
      if (!replyTarget || replyTarget.conversationId !== id) {
        return res.status(400).json({ error: 'Reply target must be a message in this conversation.' })
      }
      if (isFreeToTalk && (replyTarget.isHidden || replyTarget.isDeleted)) {
        return res.status(400).json({ error: 'Replies to hidden or deleted messages are not allowed.' })
      }
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
        content: messageContent || (attachments.length ? `Shared ${attachments.length} attachment(s)` : ''),
        tags,
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
            isHidden: true,
            isDeleted: true,
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

    const notifTitle = isFreeToTalk
      ? 'New anonymous message'
      : membership.conversation.type === 'DIRECT'
      ? `New message from ${sender.fullName}`
      : `${sender.fullName} in ${membership.conversation.title || 'Group'}`

    for (const m of isFreeToTalk ? [] : otherMembers) {
      await prisma.notification.create({
        data: {
          recipientId: m.userId,
          actorId: sender.id,
          type: membership.conversation.type === 'ANNOUNCEMENT' ? 'ANNOUNCEMENT' : 'MESSAGE',
          title: notifTitle,
          message: isFreeToTalk
            ? 'A member posted in Free to Talk.'
            : messageContent
              ? (messageContent.length > 80 ? `${messageContent.slice(0, 77)}...` : messageContent)
              : 'Sent an attachment',
          entityId: id,
        },
      })
    }

    // Real-time broadcast via Socket.IO
    const io = req.app.get('io')
    if (io) {
      const publicMessage = isFreeToTalk
        ? publicAnonymousMessage(message, sender.id)
        : message
      io.to(id).emit('new_message', publicMessage)
      // Also notify members' personal rooms to update conversation list badges
      otherMembers.forEach((m) => {
        io.to(m.userId).emit('conversation_updated', {
          conversationId: id,
          ...(isFreeToTalk
            ? (m.acceptedPolicyVersion === FREE_TO_TALK_POLICY_VERSION
                ? { latestMessage: publicMessage }
                : {})
            : { latestMessage: publicMessage }),
        })
      })
    }

    res.status(201).json({
      message: isFreeToTalk ? publicAnonymousMessage(message, sender.id) : message,
    })
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

    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' })
    }

    const normalizedContent = content.trim()
    const { tags, error: tagError } = normalizeMessageTags([], normalizedContent)
    if (tagError) return res.status(400).json({ error: tagError })

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
    const isFreeToTalk = message.conversation.freeToTalkKey === 'FREE_TO_TALK'
    if (isFreeToTalk) {
      const membership = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: { conversationId: message.conversationId, userId },
        },
      })
      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this conversation.' })
      }
      if (membership.acceptedPolicyVersion !== FREE_TO_TALK_POLICY_VERSION) {
        return res.status(428).json({ error: 'Accept the Free to Talk safety notice before editing messages.' })
      }
      if (membership.messagingRestrictedUntil && membership.messagingRestrictedUntil > new Date()) {
        return res.status(403).json({ error: 'Messaging is temporarily restricted.' })
      }
      if (message.isHidden) {
        return res.status(403).json({ error: 'Messages hidden for moderation cannot be edited.' })
      }
    }

    if (message.isDeleted) {
      return res.status(400).json({ error: 'Cannot edit a deleted message.' })
    }
    if (isFreeToTalk && (normalizedContent.length > 2000 ||
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalizedContent))) {
      return res.status(400).json({ error: 'Message must be plain text under 2,000 characters.' })
    }
    if (isFreeToTalk && tags.some((messageTag) => !FREE_TO_TALK_TAGS.has(messageTag))) {
      return res.status(400).json({ error: 'Free to Talk supports #doubt, #help, #academic, #feedback, and #general.' })
    }

    const updated = await prisma.message.update({
      where: { id },
      data: {
        content: normalizedContent,
        tags,
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
            isHidden: true,
            isDeleted: true,
            sender: { select: { id: true, fullName: true } },
          },
        },
      },
    })

    const io = req.app.get('io')
    if (io) {
      io.to(message.conversationId).emit('message_edited', isFreeToTalk
        ? publicAnonymousMessage(updated, userId)
        : updated)
    }

    res.json({ message: isFreeToTalk ? publicAnonymousMessage(updated, userId) : updated })
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
    const isFreeToTalk = message.conversation.freeToTalkKey === 'FREE_TO_TALK'
    if (!userMembership) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' })
    }
    const canDeleteOther = isFreeToTalk
      ? false
      : userMembership.role === 'ADMIN' || req.user.role === 'FACULTY'

    if (!isAuthor && !canDeleteOther) {
      return res.status(403).json({ error: 'You do not have permission to delete this message.' })
    }
    if (isFreeToTalk && isAuthor) {
      const pendingReport = await prisma.messageReport.findFirst({
        where: { messageId: id, status: 'PENDING' },
        select: { id: true },
      })
      if (pendingReport) {
        return res.status(409).json({ error: 'This message cannot be deleted while a moderation report is pending.' })
      }
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

    const isFreeToTalk = message.conversation.freeToTalkKey === 'FREE_TO_TALK'
    const pinMembership = message.conversation.members[0]
    if (!pinMembership ||
      (isFreeToTalk && !isFreeToTalkModerator(req.user, pinMembership))) {
      return res.status(403).json({ error: 'Only Free to Talk moderators may pin messages.' })
    }
    if (isFreeToTalk && pinMembership.acceptedPolicyVersion !== FREE_TO_TALK_POLICY_VERSION) {
      return res.status(428).json({ error: 'Accept the safety notice before pinning messages.' })
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
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { freeToTalkKey: true },
    })
    if (conversation?.freeToTalkKey === 'FREE_TO_TALK' &&
      membership.acceptedPolicyVersion !== FREE_TO_TALK_POLICY_VERSION) {
      return res.status(428).json({ error: 'Accept the Free to Talk safety notice before marking messages as read.' })
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
        ...(conversation?.freeToTalkKey === 'FREE_TO_TALK' && { isHidden: false }),
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
      io.to(id).emit('messages_read', conversation?.freeToTalkKey === 'FREE_TO_TALK'
        ? { conversationId: id, readAt: new Date() }
        : { conversationId: id, userId, readAt: new Date() })
    }

    res.json({ success: true, conversationId: id })
  } catch (error) {
    next(error)
  }
})

// -------------------------------------------------------------
// 13. FILE ATTACHMENT UPLOAD
// -------------------------------------------------------------
router.post('/upload', uploadMiddleware.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' })
    }

    if (/\.(jpe?g|png|webp)$/i.test(req.file.originalname) && !isSupportedImageUpload(req.file)) {
      await fs.unlink(req.file.path)
      return res.status(400).json({ error: 'The uploaded image content does not match its file type.' })
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
    const { category = 'INAPPROPRIATE_CONTENT', details = '', reason: legacyReason } = req.body
    const userId = req.user.id

    const message = await prisma.message.findUnique({
      where: { id },
      include: { conversation: true },
    })
    if (!message) return res.status(404).json({ error: 'Message not found.' })

    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: message.conversationId, userId },
      },
    })
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' })
    }
    if (message.senderId === userId) {
      return res.status(400).json({ error: 'You cannot report your own message.' })
    }

    const isFreeToTalk = message.conversation.freeToTalkKey === 'FREE_TO_TALK'
    if (isFreeToTalk &&
      membership.acceptedPolicyVersion !== FREE_TO_TALK_POLICY_VERSION) {
      return res.status(428).json({ error: 'Accept the safety notice before reporting messages.' })
    }

    const reportCategory = typeof category === 'string' ? category.toUpperCase() : ''
    const reportDetails = typeof details === 'string' ? details.trim() : ''
    const reportReason = legacyReason || reportDetails || reportCategory
    if (!reportReason || typeof reportReason !== 'string' || reportReason.length > 2000) {
      return res.status(400).json({ error: 'Choose a report reason and keep details under 2,000 characters.' })
    }
    if (isFreeToTalk && !FREE_TO_TALK_REPORT_CATEGORIES.has(reportCategory)) {
      return res.status(400).json({ error: 'Select a valid safety report category.' })
    }

    try {
      await prisma.messageReport.create({
        data: {
          messageId: id,
          reportedById: userId,
          category: isFreeToTalk ? reportCategory : 'INAPPROPRIATE_CONTENT',
          reason: reportReason.trim(),
          status: 'PENDING',
        },
      })
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'You have already reported this message.' })
      }
      throw error
    }

    res.status(201).json({ message: 'Thank you. Your anonymous report has been submitted for review.' })
  } catch (error) {
    next(error)
  }
})

const requireFreeToTalkModerator = async (conversationId, user) => {
  const [conversation, membership] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { freeToTalkKey: true, reportReviewHours: true },
    }),
    prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } },
    }),
  ])
  if (conversation?.freeToTalkKey !== 'FREE_TO_TALK' ||
    !isFreeToTalkModerator(user, membership)) {
    return null
  }
  return { conversation, membership }
}

router.get('/conversations/:id/free-to-talk/reports', async (req, res, next) => {
  try {
    const { id } = req.params
    const access = await requireFreeToTalkModerator(id, req.user)
    if (!access) return res.status(403).json({ error: 'Moderator access is required.' })

    const reportSelect = {
      id: true,
      category: true,
      reason: true,
      status: true,
      createdAt: true,
      message: {
        select: {
          id: true,
          content: true,
          tags: true,
          createdAt: true,
          isHidden: true,
          isDeleted: true,
        },
      },
    }
    const reportWhere = { message: { conversationId: id }, status: 'PENDING' }
    const priorityReports = await prisma.messageReport.findMany({
      where: {
        ...reportWhere,
        category: { in: ['THREATS', 'PERSONAL_INFORMATION'] },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: reportSelect,
    })
    const standardReports = priorityReports.length < 100
      ? await prisma.messageReport.findMany({
          where: {
            ...reportWhere,
            category: { notIn: ['THREATS', 'PERSONAL_INFORMATION'] },
          },
          orderBy: { createdAt: 'asc' },
          take: 100 - priorityReports.length,
          select: reportSelect,
        })
      : []
    const reports = [...priorityReports, ...standardReports]
    const reviewDeadlineMs = access.conversation.reportReviewHours * 60 * 60 * 1000
    res.json({ reports: reports.map((report) => {
      const reviewOverdue = Date.now() - report.createdAt.getTime() >= reviewDeadlineMs
      return {
        ...report,
        reviewOverdue,
        priority: reviewOverdue || ['THREATS', 'PERSONAL_INFORMATION'].includes(report.category),
      }
    }).sort((left, right) => Number(right.priority) - Number(left.priority) || left.createdAt - right.createdAt) })
  } catch (error) {
    next(error)
  }
})

router.post('/free-to-talk/reports/:reportId/actions', async (req, res, next) => {
  try {
    const { reportId } = req.params
    const { action, reason, durationMinutes } = req.body
    const normalizedAction = typeof action === 'string' ? action.toUpperCase() : ''
    const allowedActions = new Set(['DISMISS', 'HIDE', 'REMOVE', 'WARN', 'SUSPEND'])
    if (!allowedActions.has(normalizedAction)) {
      return res.status(400).json({ error: 'Select a supported moderation action.' })
    }
    if (typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 2000) {
      return res.status(400).json({ error: 'A moderation reason between 5 and 2,000 characters is required.' })
    }
    if (normalizedAction === 'SUSPEND' &&
      (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 10080)) {
      return res.status(400).json({ error: 'Suspensions must be between 5 minutes and 7 days.' })
    }

    const report = await prisma.messageReport.findUnique({
      where: { id: reportId },
      include: { message: { include: { conversation: true } } },
    })
    if (!report || report.message.conversation.freeToTalkKey !== 'FREE_TO_TALK') {
      return res.status(404).json({ error: 'Report not found.' })
    }
    const access = await requireFreeToTalkModerator(report.message.conversationId, req.user)
    if (!access) return res.status(403).json({ error: 'Moderator access is required.' })
    if (report.status !== 'PENDING') {
      return res.status(409).json({ error: 'This report has already been reviewed.' })
    }

    const now = new Date()
    const restrictionUntil = normalizedAction === 'SUSPEND'
      ? new Date(now.getTime() + durationMinutes * 60_000)
      : null
    await prisma.$transaction(async (tx) => {
      if (normalizedAction === 'HIDE' || normalizedAction === 'REMOVE') {
        await tx.message.update({
          where: { id: report.messageId },
          data: normalizedAction === 'HIDE'
            ? { isHidden: true }
            : { isDeleted: true, content: 'This message was removed by moderators.' },
        })
      }
      if (normalizedAction === 'SUSPEND') {
        const targetMembership = await tx.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId: report.message.conversationId,
              userId: report.message.senderId,
            },
          },
        })
        const existingRestriction = targetMembership?.messagingRestrictedUntil
        await tx.conversationMember.update({
          where: {
            conversationId_userId: {
              conversationId: report.message.conversationId,
              userId: report.message.senderId,
            },
          },
          data: {
            messagingRestrictedUntil: existingRestriction && existingRestriction > restrictionUntil
              ? existingRestriction
              : restrictionUntil,
          },
        })
      }
      await tx.messageModerationAction.create({
        data: {
          messageId: report.messageId,
          actorId: req.user.id,
          targetUserId: report.message.senderId,
          action: normalizedAction,
          reason: reason.trim(),
          restrictionUntil,
        },
      })
      await tx.messageReport.update({
        where: { id: reportId },
        data: {
          status: normalizedAction === 'DISMISS' ? 'DISMISSED' : 'RESOLVED',
          reviewedAt: now,
        },
      })
      await tx.accessAuditLog.create({
        data: {
          actorId: req.user.id,
          action: `FREE_TO_TALK_${normalizedAction}`,
          reason: reason.trim(),
          metadata: { reportId, messageId: report.messageId },
        },
      })
    })

    const io = req.app.get('io')
    if (io && ['HIDE', 'REMOVE'].includes(normalizedAction)) {
      io.to(report.message.conversationId).emit('message_moderated', {
        messageId: report.messageId,
        conversationId: report.message.conversationId,
        action: normalizedAction,
      })
    }
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

router.get('/free-to-talk/my-appeals', async (req, res, next) => {
  try {
    const appeals = await prisma.messageAppeal.findMany({
      where: {
        userId: req.user.id,
        action: { message: { conversation: { freeToTalkKey: 'FREE_TO_TALK' } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        reason: true,
        status: true,
        response: true,
        createdAt: true,
        action: { select: { id: true, action: true, restrictionUntil: true } },
      },
    })
    res.json({ appeals })
  } catch (error) {
    next(error)
  }
})

router.get('/free-to-talk/my-actions', async (req, res, next) => {
  try {
    const actions = await prisma.messageModerationAction.findMany({
      where: {
        targetUserId: req.user.id,
        action: { not: 'DISMISS' },
        message: { conversation: { freeToTalkKey: 'FREE_TO_TALK' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        action: true,
        reason: true,
        restrictionUntil: true,
        createdAt: true,
        appeals: {
          where: { userId: req.user.id },
          select: { id: true, status: true, response: true },
        },
      },
    })
    res.json({ actions })
  } catch (error) {
    next(error)
  }
})

router.get('/conversations/:id/free-to-talk/appeals', async (req, res, next) => {
  try {
    const access = await requireFreeToTalkModerator(req.params.id, req.user)
    if (!access) return res.status(403).json({ error: 'Moderator access is required.' })
    const appeals = await prisma.messageAppeal.findMany({
      where: {
        status: 'PENDING',
        action: { message: { conversationId: req.params.id } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        reason: true,
        createdAt: true,
        action: { select: { action: true, restrictionUntil: true } },
      },
    })
    res.json({ appeals })
  } catch (error) {
    next(error)
  }
})

router.post('/free-to-talk/actions/:actionId/appeal', async (req, res, next) => {
  try {
    const { actionId } = req.params
    const { reason } = req.body
    if (typeof reason !== 'string' || reason.trim().length < 10 || reason.length > 2000) {
      return res.status(400).json({ error: 'An appeal between 10 and 2,000 characters is required.' })
    }
    const action = await prisma.messageModerationAction.findFirst({
      where: {
        id: actionId,
        targetUserId: req.user.id,
        message: { conversation: { freeToTalkKey: 'FREE_TO_TALK' } },
      },
    })
    if (!action) return res.status(404).json({ error: 'Appealable action not found.' })
    if (action.action === 'DISMISS') {
      return res.status(400).json({ error: 'Dismissed reports are not moderation actions and cannot be appealed.' })
    }
    try {
      const appeal = await prisma.messageAppeal.create({
        data: { actionId, userId: req.user.id, reason: reason.trim() },
        select: { id: true, status: true, createdAt: true },
      })
      res.status(201).json({ appeal })
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'You have already appealed this action.' })
      }
      throw error
    }
  } catch (error) {
    next(error)
  }
})

router.patch('/free-to-talk/appeals/:appealId', async (req, res, next) => {
  try {
    const { appealId } = req.params
    const { decision, response } = req.body
    if (!['GRANTED', 'DENIED'].includes(decision) ||
      typeof response !== 'string' || response.trim().length < 5 || response.length > 2000) {
      return res.status(400).json({ error: 'Provide an appeal decision and response.' })
    }
    const appeal = await prisma.messageAppeal.findUnique({
      where: { id: appealId },
      include: { action: { include: { message: true } } },
    })
    if (!appeal) {
      return res.status(404).json({ error: 'Appeal not found.' })
    }
    const access = await requireFreeToTalkModerator(appeal.action.message.conversationId, req.user)
    if (!access) return res.status(403).json({ error: 'Moderator access is required.' })
    if (appeal.status !== 'PENDING') {
      return res.status(409).json({ error: 'This appeal has already been reviewed.' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.messageAppeal.update({
        where: { id: appealId },
        data: {
          status: decision,
          response: response.trim(),
          reviewedById: req.user.id,
          reviewedAt: new Date(),
        },
      })
      if (decision === 'GRANTED' && appeal.action.action === 'SUSPEND') {
        const activeRestrictions = await tx.messageModerationAction.findMany({
          where: {
            id: { not: appeal.actionId },
            targetUserId: appeal.userId,
            action: 'SUSPEND',
            restrictionUntil: { gt: new Date() },
            message: { conversationId: appeal.action.message.conversationId },
          },
          select: { restrictionUntil: true },
        })
        const restrictionUntil = activeRestrictions.reduce((latest, action) =>
          action.restrictionUntil > latest ? action.restrictionUntil : latest, null)
        await tx.conversationMember.updateMany({
          where: {
            conversationId: appeal.action.message.conversationId,
            userId: appeal.userId,
          },
          data: { messagingRestrictedUntil: restrictionUntil },
        })
      }
      await tx.accessAuditLog.create({
        data: {
          actorId: req.user.id,
          subjectId: appeal.userId,
          action: `FREE_TO_TALK_APPEAL_${decision}`,
          reason: response.trim(),
          metadata: { appealId },
        },
      })
    })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

router.patch('/conversations/:id/free-to-talk/safety-settings', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'System administrator access is required.' })
    }
    const { messageRateLimitSeconds, reportReviewHours, reason } = req.body
    if (!Number.isInteger(messageRateLimitSeconds) ||
      messageRateLimitSeconds < 1 || messageRateLimitSeconds > 60 ||
      !Number.isInteger(reportReviewHours) ||
      reportReviewHours < 1 || reportReviewHours > 720 ||
      typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 2000) {
      return res.status(400).json({ error: 'Rate limit must be 1-60 seconds and report review target 1-720 hours.' })
    }
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      select: { freeToTalkKey: true },
    })
    if (conversation?.freeToTalkKey !== 'FREE_TO_TALK') {
      return res.status(404).json({ error: 'Free to Talk group not found.' })
    }
    await prisma.$transaction(async (tx) => {
      await tx.conversation.update({
        where: { id: req.params.id },
        data: { messageRateLimitSeconds, reportReviewHours },
      })
      await tx.accessAuditLog.create({
        data: {
          actorId: req.user.id,
          action: 'FREE_TO_TALK_SAFETY_SETTINGS_UPDATED',
          reason: reason.trim(),
          metadata: { messageRateLimitSeconds, reportReviewHours },
        },
      })
    })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

router.get('/conversations/:id/free-to-talk/safety-settings', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'System administrator access is required.' })
    }
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      select: { freeToTalkKey: true, messageRateLimitSeconds: true, reportReviewHours: true },
    })
    if (conversation?.freeToTalkKey !== 'FREE_TO_TALK') {
      return res.status(404).json({ error: 'Free to Talk group not found.' })
    }
    res.json({
      messageRateLimitSeconds: conversation.messageRateLimitSeconds,
      reportReviewHours: conversation.reportReviewHours,
    })
  } catch (error) {
    next(error)
  }
})

router.patch('/conversations/:id/free-to-talk/moderators/:userId', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'System administrator access is required.' })
    }
    const { id, userId } = req.params
    const { reason } = req.body
    if (!['MODERATOR', 'MEMBER'].includes(req.body.role)) {
      return res.status(400).json({ error: 'Role must be MODERATOR or MEMBER.' })
    }
    if (typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 2000) {
      return res.status(400).json({ error: 'A reason of at least 5 characters is required.' })
    }
    const role = req.body.role === 'MODERATOR' ? 'MODERATOR' : 'MEMBER'
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { freeToTalkKey: true },
    })
    if (conversation?.freeToTalkKey !== 'FREE_TO_TALK') {
      return res.status(404).json({ error: 'Free to Talk group not found.' })
    }
    const membership = await prisma.$transaction(async (tx) => {
      const updatedMembership = role === 'MODERATOR'
        ? await tx.conversationMember.upsert({
            where: { conversationId_userId: { conversationId: id, userId } },
            update: { role },
            create: { conversationId: id, userId, role },
            select: { role: true },
          })
        : await tx.conversationMember.update({
            where: { conversationId_userId: { conversationId: id, userId } },
            data: { role },
            select: { role: true },
          })
      await tx.accessAuditLog.create({
        data: {
          actorId: req.user.id,
          subjectId: userId,
          action: role === 'MODERATOR' ? 'FREE_TO_TALK_MODERATOR_ASSIGNED' : 'FREE_TO_TALK_MODERATOR_REMOVED',
          reason: reason.trim(),
        },
      })
      return updatedMembership
    })
    res.json({ role: membership.role })
  } catch (error) {
    next(error)
  }
})

router.post('/free-to-talk/messages/:messageId/reveal-identity', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only a system administrator may review identity records.' })
    }
    const { reason } = req.body
    if (typeof reason !== 'string' || reason.trim().length < 20 || reason.length > 2000) {
      return res.status(400).json({ error: 'A legitimate investigation reason of at least 20 characters is required.' })
    }
    const message = await prisma.message.findUnique({
      where: { id: req.params.messageId },
      include: { conversation: { select: { freeToTalkKey: true } } },
    })

    if (!message || message.conversation.freeToTalkKey !== 'FREE_TO_TALK') {
      return res.status(404).json({ error: 'Message not found.' })
    }
    await prisma.accessAuditLog.create({
      data: {
        actorId: req.user.id,
        subjectId: message.senderId,
        action: 'FREE_TO_TALK_IDENTITY_REVEALED',
        reason: reason.trim(),
        metadata: { messageId: message.id, conversationId: message.conversationId },
      },
    })
    const identity = await prisma.user.findUnique({
      where: { id: message.senderId },
      select: { id: true, fullName: true, email: true, rollNumber: true, role: true },
    })
    res.json({ identity })
  } catch (error) {
    next(error)
  }
})

router.get('/admin/free-to-talk/audit', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'System administrator access is required.' })
    }
    const reason = typeof req.query.reason === 'string' ? req.query.reason.trim() : ''
    if (reason.length < 10 || reason.length > 2000) {
      return res.status(400).json({ error: 'A reason of 10-2,000 characters is required to access audit records.' })
    }
    await prisma.accessAuditLog.create({
      data: {
        actorId: req.user.id,
        action: 'FREE_TO_TALK_AUDIT_ACCESSED',
        reason,
      },
    })
    const logs = await prisma.accessAuditLog.findMany({
      where: { action: { startsWith: 'FREE_TO_TALK_' } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        action: true,
        reason: true,
        metadata: true,
        createdAt: true,
        actor: { select: { fullName: true, role: true } },
        subject: { select: { id: true } },
      },
    })
    res.json({ logs })
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
