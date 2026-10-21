const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

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
      errorMsg = errorData.error || errorMsg
    } catch (e) {
      errorMsg = response.statusText || errorMsg
    }
    throw new Error(errorMsg)
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

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await fetch(`${API_BASE_URL}/auth/users${query ? `?${query}` : ''}`, {
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

  async reportMessage(messageId, reason) {
    const res = await fetch(`${API_BASE_URL}/communication/messages/${messageId}/report`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
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
