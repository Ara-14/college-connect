export const FREE_TO_TALK_POLICY_VERSION = '2026-10-23-v1'

export const FREE_TO_TALK_NOTICE =
  "Welcome to Free to Talk!! Speak freely, ask questions, and connect with your college community. Your identity is hidden from other group members. Please respect everyone's privacy and follow the community safety rules. Authorized moderation processes may review reported content, and anonymity is not a guarantee against identification in every circumstance."

export const FREE_TO_TALK_TAGS = new Set([
  'doubt',
  'help',
  'academic',
  'feedback',
  'general',
])

export const FREE_TO_TALK_REPORT_CATEGORIES = new Set([
  'HARASSMENT',
  'SPAM',
  'THREATS',
  'PERSONAL_INFORMATION',
  'INAPPROPRIATE_CONTENT',
  'ACADEMIC_INTEGRITY',
  'RETALIATION',
  'OTHER',
])

export const isFreeToTalkModerator = (user, membership) =>
  user.role === 'ADMIN' || membership?.role === 'MODERATOR'
