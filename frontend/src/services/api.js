const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
const API_ORIGIN = /^https?:\/\//.test(API_BASE_URL) ? new URL(API_BASE_URL).origin : ''
const MEDIA_BASE_URL = (import.meta.env.VITE_MEDIA_BASE_URL || API_ORIGIN || SOCKET_URL).replace(/\/$/, '')

export const getFullMediaUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

export const getDefaultAvatar = (name = 'Student', role = 'STUDENT') => {
  if (role === 'FACULTY') {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
  }
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=7c3aed,3b82f6`
}

const getHeaders = (isMultipart = false) => {
  const token = localStorage.getItem('cc_auth_token')
  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMsg = 'An error occurred'
    try {
      const errorData = await response.json()
      errorMsg = errorData.error || errorData.message || errorMsg
    } catch {
      errorMsg = response.statusText || errorMsg
    }
    const error = new Error(errorMsg)
    error.status = response.status
    throw error
  }
  return response.json()
}

export const api = {
  // Auth
  async login(login, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    })
    return handleResponse(res)
  },

  async register(data) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  async getMe() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async updateProfile(data) {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  async uploadAvatar(file) {
    const formData = new FormData()
    formData.append('avatar', file)
    const res = await fetch(`${API_BASE_URL}/auth/avatar`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    })
    return handleResponse(res)
  },

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await fetch(`${API_BASE_URL}/auth/users${query ? `?${query}` : ''}`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  // Posts & Social Feed
  async getPosts() {
    const res = await fetch(`${API_BASE_URL}/posts`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async createPost(formData) {
    const res = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    })
    return handleResponse(res)
  },

  async toggleLike(postId) {
    const res = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async addComment(postId, content) {
    const res = await fetch(`${API_BASE_URL}/posts/${postId}/comment`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    })
    return handleResponse(res)
  },

  async toggleSave(postId) {
    const res = await fetch(`${API_BASE_URL}/posts/${postId}/save`, {
      method: 'POST',
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async deletePost(postId) {
    const res = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  // Communication
  async getConversations() {
    const res = await fetch(`${API_BASE_URL}/communication/conversations`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async askPersonalAI(prompt) {
    const res = await fetch(`${API_BASE_URL}/ai/ask`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt }),
    })
    return handleResponse(res)
  },

  async getConversation(id) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${id}`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async getDirectConversation(recipientId, subject, queryCategory) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/direct`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ recipientId, subject, queryCategory }),
    })
    return handleResponse(res)
  },

  async createGroup(data) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/group`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  async updateConversation(id, data) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  async addGroupMembers(id, userIds) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${id}/members`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userIds }),
    })
    return handleResponse(res)
  },

  async getMessages(conversationId, params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${conversationId}/messages${query ? `?${query}` : ''}`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async getMessageTagCounts(conversationId) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${conversationId}/message-tag-counts`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async acceptFreeToTalkPolicy(conversationId) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${conversationId}/free-to-talk/accept-policy`, {
      method: 'POST',
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async getFreeToTalkReports(conversationId) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${conversationId}/free-to-talk/reports`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async getFreeToTalkAppeals(conversationId) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${conversationId}/free-to-talk/appeals`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async getFreeToTalkSettings(conversationId) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${conversationId}/free-to-talk/safety-settings`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async moderateFreeToTalkReport(reportId, data) {
    const res = await fetch(`${API_BASE_URL}/communication/free-to-talk/reports/${reportId}/actions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  async getMyFreeToTalkAppeals() {
    const res = await fetch(`${API_BASE_URL}/communication/free-to-talk/my-appeals`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async getMyFreeToTalkActions() {
    const res = await fetch(`${API_BASE_URL}/communication/free-to-talk/my-actions`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async appealFreeToTalkAction(actionId, reason) {
    const res = await fetch(`${API_BASE_URL}/communication/free-to-talk/actions/${actionId}/appeal`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    })
    return handleResponse(res)
  },

  async reviewFreeToTalkAppeal(appealId, decision, response) {
    const res = await fetch(`${API_BASE_URL}/communication/free-to-talk/appeals/${appealId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ decision, response }),
    })
    return handleResponse(res)
  },

  async updateFreeToTalkSettings(conversationId, data) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${conversationId}/free-to-talk/safety-settings`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  async updateFreeToTalkModerator(conversationId, userId, role, reason) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${conversationId}/free-to-talk/moderators/${userId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ role, reason }),
    })
    return handleResponse(res)
  },

  async revealFreeToTalkIdentity(messageId, reason) {
    const res = await fetch(`${API_BASE_URL}/communication/free-to-talk/messages/${messageId}/reveal-identity`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    })
    return handleResponse(res)
  },

  async sendMessage(conversationId, data) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  async editMessage(messageId, content) {
    const res = await fetch(`${API_BASE_URL}/communication/messages/${messageId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    })
    return handleResponse(res)
  },

  async deleteMessage(messageId) {
    const res = await fetch(`${API_BASE_URL}/communication/messages/${messageId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async togglePinMessage(messageId) {
    const res = await fetch(`${API_BASE_URL}/communication/messages/${messageId}/pin`, {
      method: 'POST',
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async markConversationRead(conversationId) {
    const res = await fetch(`${API_BASE_URL}/communication/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async uploadAttachment(file) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_BASE_URL}/communication/upload`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    })
    return handleResponse(res)
  },

  async getCommunityChannels() {
    const res = await fetch(`${API_BASE_URL}/communities/channels`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async getCommunityEvents(channelId) {
    const query = channelId ? `?channelId=${encodeURIComponent(channelId)}` : ''
    const res = await fetch(`${API_BASE_URL}/communities/events${query}`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async createCommunityEvent(data) {
    const res = await fetch(`${API_BASE_URL}/communities/events`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  async reportMessage(messageId, category, details = '') {
    const res = await fetch(`${API_BASE_URL}/communication/messages/${messageId}/report`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ category, details }),
    })
    return handleResponse(res)
  },

  async toggleBlockUser(userId) {
    const res = await fetch(`${API_BASE_URL}/communication/users/${userId}/block`, {
      method: 'POST',
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  // Notifications
  async getNotifications() {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'POST',
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  // Academic vault
  async getCourses() {
    const res = await fetch(`${API_BASE_URL}/academic/courses`, {
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async recordResourceDownload(resourceId) {
    const res = await fetch(`${API_BASE_URL}/academic/resources/${resourceId}/download`, {
      method: 'POST',
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async uploadAcademicResource(data, file) {
    const formData = new FormData()
    formData.append('title', data.title)
    if (data.description) formData.append('description', data.description)
    formData.append('category', data.category || 'NOTES')
    formData.append('subjectId', data.subjectId)
    if (file) formData.append('file', file)

    const res = await fetch(`${API_BASE_URL}/academic/upload`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    })
    return handleResponse(res)
  },
}
