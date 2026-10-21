import { useState, useEffect, useRef } from 'react'
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Pin,
  VolumeX,
  Volume2,
  Users,
  Search,
  Check,
  CheckCheck,
  CornerDownRight,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  FileText,
  Download,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react'
import { api } from '../../services/api'
import {
  joinConversationRoom,
  leaveConversationRoom,
  emitTypingStart,
  emitTypingStop,
} from '../../services/socket'

export default function ChatWindow({
  conversation,
  currentUser,
  onOpenGroupInfo,
  onOpenReportModal,
  onConversationUpdated,
}) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [queryCategory, setQueryCategory] = useState('')
  const [stagedFiles, setStagedFiles] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [typingUser, setTypingUser] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [searchInChat, setSearchInChat] = useState('')
  const [showSearchBox, setShowSearchBox] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const isDirect = conversation.type === 'DIRECT' || conversation.type === 'QUERY'
  const otherMember = conversation.otherMember
  const isFaculty = currentUser.role === 'FACULTY' || currentUser.role === 'ADMIN'
  const isReadOnly = conversation.isReadOnly && !isFaculty
  const canSend = !isReadOnly

  // Determine if this is a student-to-faculty chat to show academic query options
  const isStudentToFaculty =
    currentUser.role === 'STUDENT' && isDirect && otherMember?.role === 'FACULTY'

  // Fetch messages for conversation
  const fetchMessages = async () => {
    try {
      setLoading(true)
      const data = await api.getMessages(conversation.id)
      setMessages(data.messages || [])
      // Mark as read
      await api.markConversationRead(conversation.id)
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    joinConversationRoom(conversation.id)

    return () => {
      leaveConversationRoom(conversation.id)
    }
  }, [conversation.id])

  // Scroll to bottom when messages update
  useEffect(() => {
    if (!showSearchBox) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, showSearchBox])

  // Real-time message listener
  useEffect(() => {
    const handleNewMessage = (newMsg) => {
      if (newMsg.conversationId === conversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
        api.markConversationRead(conversation.id)
      }
    }

    const handleMessageEdited = (editedMsg) => {
      if (editedMsg.conversationId === conversation.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === editedMsg.id ? editedMsg : m))
        )
      }
    }

    const handleMessageDeleted = ({ messageId, conversationId }) => {
      if (conversationId === conversation.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, content: 'This message was deleted.' }
              : m
          )
        )
      }
    }

    const handleMessagePinned = ({ messageId, isPinned }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isPinned } : m))
      )
      onConversationUpdated?.()
    }

    const handleUserTyping = ({ conversationId, userId, userName }) => {
      if (conversationId === conversation.id && userId !== currentUser.id) {
        setTypingUser(userName)
      }
    }

    const handleUserStoppedTyping = ({ conversationId }) => {
      if (conversationId === conversation.id) {
        setTypingUser(null)
      }
    }

    // Attach to window custom event or socket
    window.addEventListener('cc_socket_new_message', (e) => handleNewMessage(e.detail))
    window.addEventListener('cc_socket_message_edited', (e) => handleMessageEdited(e.detail))
    window.addEventListener('cc_socket_message_deleted', (e) => handleMessageDeleted(e.detail))
    window.addEventListener('cc_socket_message_pinned', (e) => handleMessagePinned(e.detail))
    window.addEventListener('cc_socket_user_typing', (e) => handleUserTyping(e.detail))
    window.addEventListener('cc_socket_user_stopped_typing', (e) => handleUserStoppedTyping(e.detail))

    return () => {
      window.removeEventListener('cc_socket_new_message', (e) => handleNewMessage(e.detail))
      window.removeEventListener('cc_socket_message_edited', (e) => handleMessageEdited(e.detail))
      window.removeEventListener('cc_socket_message_deleted', (e) => handleMessageDeleted(e.detail))
      window.removeEventListener('cc_socket_message_pinned', (e) => handleMessagePinned(e.detail))
      window.removeEventListener('cc_socket_user_typing', (e) => handleUserTyping(e.detail))
      window.removeEventListener('cc_socket_user_stopped_typing', (e) => handleUserStoppedTyping(e.detail))
    }
  }, [conversation.id, currentUser.id])

  // Handle typing status emission
  const handleInputChange = (e) => {
    setInputText(e.target.value)

    emitTypingStart(conversation.id, currentUser)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(conversation.id, currentUser)
    }, 2000)
  }

  // File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      const res = await api.uploadAttachment(file)
      setStagedFiles((prev) => [...prev, res])
    } catch (err) {
      alert(`File upload failed: ${err.message}`)
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeStagedFile = (idx) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  // Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if ((!inputText.trim() && stagedFiles.length === 0) || !canSend) return

    const payload = {
      content: inputText.trim(),
      replyToId: replyingTo?.id || undefined,
      queryCategory: queryCategory || undefined,
      attachments: stagedFiles,
    }

    // Clear inputs immediately
    setInputText('')
    setStagedFiles([])
    setReplyingTo(null)
    setQueryCategory('')
    setShowEmojiPicker(false)
    emitTypingStop(conversation.id, currentUser)

    try {
      const res = await api.sendMessage(conversation.id, payload)
      setMessages((prev) => [...prev, res.message])
      onConversationUpdated?.()
    } catch (err) {
      alert(`Failed to send message: ${err.message}`)
    }
  }

  // Edit Message
  const startEditing = (msg) => {
    setEditingMessageId(msg.id)
    setEditingContent(msg.content)
  }

  const handleSaveEdit = async () => {
    if (!editingContent.trim()) return
    try {
      const res = await api.editMessage(editingMessageId, editingContent.trim())
      setMessages((prev) =>
        prev.map((m) => (m.id === editingMessageId ? res.message : m))
      )
      setEditingMessageId(null)
      setEditingContent('')
    } catch (err) {
      alert(`Failed to edit message: ${err.message}`)
    }
  }

  // Delete Message
  const handleDeleteMessage = async (msgId) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    try {
      await api.deleteMessage(msgId)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, isDeleted: true, content: 'This message was deleted.' }
            : m
        )
      )
    } catch (err) {
      alert(`Failed to delete message: ${err.message}`)
    }
  }

  // Pin Message
  const handleTogglePin = async (msgId) => {
    try {
      await api.togglePinMessage(msgId)
      fetchMessages()
      onConversationUpdated?.()
    } catch (err) {
      alert(`Failed to pin message: ${err.message}`)
    }
  }

  // Mute Conversation
  const handleToggleMute = async () => {
    const isMuted = !conversation.myMembership?.isMuted
    try {
      await api.updateConversation(conversation.id, { isMuted })
      onConversationUpdated?.()
    } catch (err) {
      alert(`Failed to update notification settings: ${err.message}`)
    }
  }

  // Archive Conversation
  const handleToggleArchive = async () => {
    const isArchived = !conversation.myMembership?.isArchived
    try {
      await api.updateConversation(conversation.id, { isArchived })
      onConversationUpdated?.()
      setHeaderMenuOpen(false)
    } catch (err) {
      alert(`Failed to archive conversation: ${err.message}`)
    }
  }

  // Quick Emoji Insertion
  const quickEmojis = ['🎓', '📚', '💡', '🚀', '👍', '❤️', '🔥', '👏', '✅', '❓']
  const addEmoji = (emoji) => {
    setInputText((prev) => prev + emoji)
  }

  // Filter messages for search
  const displayedMessages = messages.filter((m) =>
    searchInChat
      ? m.content.toLowerCase().includes(searchInChat.toLowerCase()) ||
        m.sender?.fullName.toLowerCase().includes(searchInChat.toLowerCase())
      : true
  )

  const pinnedMsg = messages.find((m) => m.isPinned) || conversation.pinnedMessage

  return (
    <div className="cc-chat-window">
      {/* 1. CHAT HEADER */}
      <div className="cc-chat-header">
        <div className="cc-chat-header-info">
          <div className="cc-header-avatar-box">
            {isDirect ? (
              <>
                <img src={otherMember?.avatarUrl} alt="" className="cc-avatar-md" />
                <span className={`cc-status-dot ${otherMember?.status === 'ONLINE' ? 'online' : 'offline'}`} />
              </>
            ) : (
              <div className="cc-group-avatar-badge">
                <Users size={20} />
              </div>
            )}
          </div>

          <div>
            <div className="cc-header-name-row">
              <h3>{conversation.title || otherMember?.fullName || 'Conversation'}</h3>
              {otherMember?.role && (
                <span className={`cc-role-badge ${otherMember.role === 'FACULTY' ? 'badge-faculty' : 'badge-student'}`}>
                  {otherMember.role === 'FACULTY' ? 'Faculty' : 'Student'}
                </span>
              )}
              {conversation.type === 'ANNOUNCEMENT' && (
                <span className="cc-role-badge badge-announcement">Broadcast</span>
              )}
            </div>

            <div className="cc-header-subtext">
              {typingUser ? (
                <span className="cc-typing-text">✏️ {typingUser} is typing...</span>
              ) : isDirect ? (
                <>
                  <span>{otherMember?.status === 'ONLINE' ? '🟢 Online' : 'Offline'}</span>
                  {otherMember?.department && <span> • {otherMember.department}</span>}
                  {otherMember?.officeHours && (
                    <span className="cc-office-pill">
                      <Clock size={12} /> {otherMember.officeHours}
                    </span>
                  )}
                </>
              ) : (
                <span>
                  {conversation.members?.length || 0} members • {conversation.department || 'Campus'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="cc-chat-header-actions">
          <button
            className={`cc-icon-btn ${showSearchBox ? 'active' : ''}`}
            title="Search in messages"
            onClick={() => setShowSearchBox(!showSearchBox)}
          >
            <Search size={18} />
          </button>

          <button
            className="cc-icon-btn"
            title={conversation.myMembership?.isMuted ? 'Unmute' : 'Mute'}
            onClick={handleToggleMute}
          >
            {conversation.myMembership?.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {!isDirect && (
            <button
              className="cc-icon-btn"
              title="Group Information & Members"
              onClick={onOpenGroupInfo}
            >
              <Users size={18} />
            </button>
          )}

          <div className="cc-relative">
            <button
              className="cc-icon-btn"
              onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
            >
              <MoreVertical size={18} />
            </button>

            {headerMenuOpen && (
              <div className="cc-dropdown-menu">
                <button className="cc-menu-item" onClick={handleToggleArchive}>
                  {conversation.myMembership?.isArchived ? 'Unarchive Conversation' : 'Archive Conversation'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH BOX IN CHAT */}
      {showSearchBox && (
        <div className="cc-chat-search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search messages in this conversation..."
            value={searchInChat}
            onChange={(e) => setSearchInChat(e.target.value)}
            autoFocus
          />
          {searchInChat && (
            <button className="cc-icon-btn cc-btn-xs" onClick={() => setSearchInChat('')}>
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* PINNED MESSAGE BANNER */}
      {pinnedMsg && (
        <div className="cc-pinned-banner">
          <Pin size={16} className="text-emerald-400" />
          <div className="cc-pinned-text">
            <strong>Pinned Message: </strong>
            <span>{pinnedMsg.content}</span>
          </div>
          {isFaculty && (
            <button
              className="cc-icon-btn cc-btn-xs"
              title="Unpin message"
              onClick={() => handleTogglePin(pinnedMsg.id)}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* 2. MESSAGES CONTAINER */}
      <div className="cc-messages-container">
        {loading ? (
          <div className="cc-loading-center">
            <div className="cc-spinner" />
            <p>Loading messages...</p>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="cc-empty-state">
            <Sparkles size={40} className="text-emerald-400" />
            <h3>Start the conversation</h3>
            <p>Send a message, ask an academic question, or share study materials.</p>
          </div>
        ) : (
          displayedMessages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.id
            const isOther = !isMe
            const sender = msg.sender
            const isEditing = editingMessageId === msg.id

            return (
              <div
                key={msg.id}
                className={`cc-message-row ${isMe ? 'self' : 'other'}`}
              >
                {/* Avatar for others in group */}
                {isOther && !isDirect && (
                  <img
                    src={sender?.avatarUrl}
                    alt=""
                    className="cc-msg-avatar"
                    title={sender?.fullName}
                  />
                )}

                <div className="cc-bubble-wrap">
                  {/* Sender Name & Role Badge in Groups */}
                  {isOther && !isDirect && (
                    <div className="cc-msg-sender-header">
                      <span className="cc-msg-sender-name">{sender?.fullName}</span>
                      <span className={`cc-role-badge ${sender?.role === 'FACULTY' ? 'badge-faculty' : 'badge-student'}`}>
                        {sender?.role === 'FACULTY' ? 'Faculty' : 'Student'}
                      </span>
                    </div>
                  )}

                  {/* Query Category Tag */}
                  {msg.queryCategory && (
                    <div className="cc-query-tag">
                      <Sparkles size={12} />
                      <span>{msg.queryCategory}</span>
                    </div>
                  )}

                  {/* Reply Quote Banner */}
                  {msg.replyTo && (
                    <div className="cc-reply-quote">
                      <CornerDownRight size={13} />
                      <div>
                        <strong>{msg.replyTo.sender?.fullName || 'User'}: </strong>
                        <span>{msg.replyTo.content}</span>
                      </div>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className={`cc-message-bubble ${isMe ? 'bubble-me' : 'bubble-other'} ${msg.isDeleted ? 'bubble-deleted' : ''}`}>
                    {isEditing ? (
                      <div className="cc-inline-edit">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="cc-edit-input"
                          rows={2}
                        />
                        <div className="cc-flex-end cc-gap-1 cc-mt-1">
                          <button
                            className="cc-btn cc-btn-secondary cc-btn-xs"
                            onClick={() => setEditingMessageId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="cc-btn cc-btn-primary cc-btn-xs"
                            onClick={handleSaveEdit}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="cc-message-text">{msg.content}</p>

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="cc-message-attachments">
                            {msg.attachments.map((att) => (
                              <div key={att.id} className="cc-attachment-card">
                                <FileText size={24} className="text-emerald-400" />
                                <div className="cc-att-info">
                                  <strong>{att.fileName}</strong>
                                  <small>{att.fileSize || att.fileType}</small>
                                </div>
                                <a
                                  href={`http://localhost:5000${att.fileUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cc-icon-btn cc-btn-download"
                                  title="Download / View"
                                >
                                  <Download size={16} />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Metadata: Edited, Time, Read Status */}
                    <div className="cc-bubble-meta">
                      {msg.isEdited && <span className="cc-edited-tag">(edited)</span>}
                      <span className="cc-time-text">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {/* Read status for self messages */}
                      {isMe && !msg.isDeleted && (
                        <span className="cc-read-receipt" title={msg.isRead ? 'Read' : 'Delivered'}>
                          {msg.isRead || (msg.readReceipts && msg.readReceipts.length > 0) ? (
                            <CheckCheck size={14} className="text-emerald-400" />
                          ) : (
                            <Check size={14} className="text-gray-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Toolbar on Hover */}
                  {!msg.isDeleted && !isEditing && (
                    <div className="cc-bubble-toolbar">
                      <button
                        className="cc-toolbar-btn"
                        title="Reply"
                        onClick={() => setReplyingTo(msg)}
                      >
                        <CornerDownRight size={14} />
                      </button>

                      {isMe && (
                        <button
                          className="cc-toolbar-btn"
                          title="Edit"
                          onClick={() => startEditing(msg)}
                        >
                          <Edit2 size={14} />
                        </button>
                      )}

                      <button
                        className="cc-toolbar-btn"
                        title={msg.isPinned ? 'Unpin' : 'Pin'}
                        onClick={() => handleTogglePin(msg.id)}
                      >
                        <Pin size={14} />
                      </button>

                      {(isMe || isFaculty) && (
                        <button
                          className="cc-toolbar-btn"
                          title="Delete"
                          onClick={() => handleDeleteMessage(msg.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      {isOther && (
                        <button
                          className="cc-toolbar-btn"
                          title="Report message"
                          onClick={() => onOpenReportModal(msg)}
                        >
                          <AlertTriangle size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. MESSAGE COMPOSER */}
      {isReadOnly ? (
        <div className="cc-readonly-banner">
          <ShieldAlert size={18} />
          <span>This is an official announcement broadcast channel. Only faculty members can post announcements.</span>
        </div>
      ) : (
        <div className="cc-composer-area">
          {/* Replying banner */}
          {replyingTo && (
            <div className="cc-replying-banner">
              <CornerDownRight size={14} />
              <div className="cc-reply-context">
                <strong>Replying to {replyingTo.sender?.fullName || 'User'}: </strong>
                <span>{replyingTo.content}</span>
              </div>
              <button
                className="cc-icon-btn cc-btn-xs"
                onClick={() => setReplyingTo(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Staged attachments preview */}
          {stagedFiles.length > 0 && (
            <div className="cc-staged-files-bar">
              {stagedFiles.map((f, i) => (
                <div key={i} className="cc-staged-file-pill">
                  <FileText size={14} />
                  <span>{f.fileName}</span>
                  <small>({f.fileSize})</small>
                  <button onClick={() => removeStagedFile(i)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Student-to-Faculty Academic Query Selector */}
          {isStudentToFaculty && (
            <div className="cc-query-category-bar">
              <label>Query Topic:</label>
              <select
                value={queryCategory}
                onChange={(e) => setQueryCategory(e.target.value)}
                className="cc-query-select"
              >
                <option value="">General Query</option>
                <option value="Doubt Clarification">Doubt Clarification</option>
                <option value="Assignment Help">Assignment Help</option>
                <option value="Project Guidance">Project Guidance</option>
                <option value="Exam / Test Query">Exam / Test Query</option>
              </select>
            </div>
          )}

          {/* Quick emoji bar */}
          {showEmojiPicker && (
            <div className="cc-quick-emoji-bar">
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="cc-quick-emoji-btn"
                  onClick={() => addEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="cc-composer-form">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.zip"
            />

            <button
              type="button"
              className="cc-composer-btn"
              title="Attach PDF, Document or Image"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
            >
              <Paperclip size={18} />
            </button>

            <button
              type="button"
              className={`cc-composer-btn ${showEmojiPicker ? 'active' : ''}`}
              title="Emojis"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={18} />
            </button>

            <textarea
              className="cc-composer-input"
              placeholder={
                isStudentToFaculty
                  ? 'Ask academic query to professor... (Enter to send, Shift+Enter for newline)'
                  : 'Type a message... (Enter to send, Shift+Enter for newline)'
              }
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              rows={1}
            />

            <button
              type="submit"
              className="cc-send-btn"
              disabled={!inputText.trim() && stagedFiles.length === 0}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
