export const MESSAGE_TAGS = [
  'doubt',
  'help',
  'assignment',
  'notes',
  'exam',
  'important',
  'project',
  'lab',
  'resources',
  'placement',
  'announcement',
  'discussion',
  'studygroup',
  'event',
  'meeting',
  'urgent',
  'lostfound',
  'recommendation',
  'academic',
  'feedback',
  'general',
]

const allowedMessageTags = new Set(MESSAGE_TAGS)
const tagPattern = /^#?([a-z][a-z0-9_-]{0,31})$/i
const contentTagPattern = /(?:^|[^\w])#([a-z][a-z0-9_-]{0,31})/gi

export const normalizeMessageTags = (providedTags, content = '') => {
  if (!Array.isArray(providedTags) || providedTags.length > MESSAGE_TAGS.length) {
    return { tags: null, error: 'Tags must be an array with no more than 18 entries.' }
  }

  const tags = new Set()
  const values = [...providedTags]
  for (const match of content.matchAll(contentTagPattern)) {
    values.push(match[1])
  }

  for (const value of values) {
    if (typeof value !== 'string') {
      return { tags: null, error: 'Each message tag must be text.' }
    }

    const match = tagPattern.exec(value.trim())
    const normalizedTag = match?.[1].toLowerCase()
    if (!normalizedTag || !allowedMessageTags.has(normalizedTag)) {
      return { tags: null, error: `Unsupported message tag: ${value}` }
    }

    tags.add(normalizedTag)
  }

  return { tags: [...tags], error: null }
}
