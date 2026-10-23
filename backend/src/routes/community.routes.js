import { Router } from 'express'
import prisma from '../config/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
const COMMUNITY_NAME = 'College Connect'
const DEFAULT_CHANNELS = [
  { name: 'general', description: 'Campus-wide conversation.' },
  { name: 'announcements', description: 'Official faculty announcements.' },
  { name: 'coding-club', description: 'Programming, projects, and coding events.' },
  { name: 'campus-events', description: 'Events and activities across campus.' },
  { name: 'memes', description: 'Campus humor and light conversation.' },
]

router.use(authenticate)

const getOrCreateChannels = async (userId) => {
  const community = await prisma.community.upsert({
    where: { name: COMMUNITY_NAME },
    update: {},
    create: {
      name: COMMUNITY_NAME,
      description: 'Official College Connect community channels.',
      createdById: userId,
    },
  })

  const channels = await Promise.all(DEFAULT_CHANNELS.map(({ name, description }) =>
    prisma.channel.upsert({
      where: { communityId_name: { communityId: community.id, name } },
      update: {},
      create: { communityId: community.id, name, description },
    })
  ))

  return Promise.all(channels.map(async (channel) => {
    const conversation = await prisma.conversation.upsert({
      where: { communityChannelId: channel.id },
      update: {},
      create: {
        communityChannelId: channel.id,
        title: `#${channel.name}`,
        description: channel.description,
        type: 'GROUP',
        createdById: userId,
        members: { create: { userId, role: 'MEMBER' } },
      },
    })

    const membership = await prisma.conversationMember.upsert({
      where: {
        conversationId_userId: { conversationId: conversation.id, userId },
      },
      update: {},
      create: { conversationId: conversation.id, userId, role: 'MEMBER' },
    })

    const details = await prisma.conversation.findUnique({
      where: { id: conversation.id },
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
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, fullName: true, role: true } },
            attachments: true,
          },
        },
        pinnedMessage: {
          include: { sender: { select: { id: true, fullName: true, role: true } } },
        },
      },
    })

    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      conversation: {
        ...details,
        myMembership: {
          role: membership.role,
          isMuted: membership.isMuted,
          isArchived: membership.isArchived,
          lastReadAt: membership.lastReadAt,
        },
        latestMessage: details.messages[0] || null,
        unreadCount: 0,
      },
    }
  }))
}

router.get('/channels', async (req, res, next) => {
  try {
    res.json({ channels: await getOrCreateChannels(req.user.id) })
  } catch (error) {
    next(error)
  }
})

router.get('/events', async (req, res, next) => {
  try {
    const channelId = typeof req.query.channelId === 'string' ? req.query.channelId : undefined
    const events = await prisma.communityEvent.findMany({
      where: channelId ? { channelId } : {},
      include: {
        creator: { select: { id: true, fullName: true, username: true, avatarUrl: true, role: true } },
        channel: { select: { id: true, name: true } },
      },
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
    })
    res.json({ events })
  } catch (error) {
    next(error)
  }
})

router.post('/events', async (req, res, next) => {
  try {
    const { channelId, title, description, startsAt, location } = req.body
    const cleanTitle = typeof title === 'string' ? title.trim() : ''
    const eventDate = new Date(startsAt)

    if (!channelId || !cleanTitle || cleanTitle.length > 120 || !startsAt || Number.isNaN(eventDate.getTime())) {
      return res.status(400).json({ error: 'Choose a channel, a title under 120 characters, and a valid event date.' })
    }
    if ((typeof description === 'string' && description.trim().length > 2000) ||
      (typeof location === 'string' && location.trim().length > 200)) {
      return res.status(400).json({ error: 'Event descriptions are limited to 2,000 characters and locations to 200 characters.' })
    }

    const channel = await prisma.channel.findUnique({ where: { id: channelId } })
    if (!channel) return res.status(404).json({ error: 'Community channel was not found.' })

    const event = await prisma.communityEvent.create({
      data: {
        channelId,
        createdById: req.user.id,
        title: cleanTitle,
        description: typeof description === 'string' ? description.trim() || null : null,
        startsAt: eventDate,
        location: typeof location === 'string' ? location.trim() || null : null,
      },
      include: {
        creator: { select: { id: true, fullName: true, username: true, avatarUrl: true, role: true } },
        channel: { select: { id: true, name: true } },
      },
    })
    res.status(201).json({ event })
  } catch (error) {
    next(error)
  }
})

export default router
