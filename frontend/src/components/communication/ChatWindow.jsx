import { useState, useEffect, useRef, useCallback } from 'react'
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
  Shield,
  MessageCircleMore,
  Mic,
  Square,
} from 'lucide-react'
import { api, getDefaultAvatar, getFullMediaUrl } from '../../services/api'
import { MESSAGE_TAGS } from './messageTags'
import FreeToTalkModerationPanel from './FreeToTalkModerationPanel'
import FreeToTalkAppeals from './FreeToTalkAppeals'
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
  focusComposerOnOpen = false,
  onAskPersonalAI,
}) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [queryCategory, setQueryCategory] = useState('')
  const [stagedFiles, setStagedFiles] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [typingUser, setTypingUser] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [searchState, setSearchState] = useState({ conversationId: conversation.id, value: '' })
  const searchInChat = searchState.conversationId === conversation.id ? searchState.value : ''
  const setSearchInChat = (value) => setSearchState({ conversationId: conversation.id, value })
  const [debouncedSearchState, setDebouncedSearchState] = useState({
    conversationId: conversation.id,
    value: '',
  })
  const debouncedSearch = debouncedSearchState.conversationId === conversation.id
    ? debouncedSearchState.value
    : ''
  const [tagFilterState, setTagFilterState] = useState({ conversationId: conversation.id, tag: '' })
  const activeTag = tagFilterState.conversationId === conversation.id ? tagFilterState.tag : ''
  const setActiveTag = (tag) => setTagFilterState({ conversationId: conversation.id, tag })
  const [tagCountState, setTagCountState] = useState({ conversationId: conversation.id, counts: {} })
  const tagCounts = tagCountState.conversationId === conversation.id ? tagCountState.counts : {}
  const [tagCountLoading, setTagCountLoading] = useState(true)
  const [tagCountError, setTagCountError] = useState('')
  const [messageError, setMessageError] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false)
  const [showSearchBox, setShowSearchBox] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [policyAcceptedState, setPolicyAcceptedState] = useState({
    conversationId: conversation.id,
    accepted: Boolean(conversation.myMembership?.hasAcceptedPolicy),
  })
  const [policyAccepting, setPolicyAccepting] = useState(false)
  const [policyError, setPolicyError] = useState('')
  const [showModerationPanel, setShowModerationPanel] = useState(false)
  const [showAppealsPanel, setShowAppealsPanel] = useState(false)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const composerInputRef = useRef(null)
  const voiceRecorderRef = useRef(null)
  const voiceStreamRef = useRef(null)
  const voiceRecordingTimerRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fetchRequestRef = useRef(0)
  const tagCountRequestRef = useRef(0)
  const messageFiltersRef = useRef({ tag: '', search: '' })
  const fetchMessagesRef = useRef(null)
  const fetchTagCountsRef = useRef(null)
  const onConversationUpdatedRef = useRef(onConversationUpdated)

  const isDirect = conversation.type === 'DIRECT' || conversation.type === 'QUERY'
  const isFreeToTalk = Boolean(conversation.isFreeToTalk)
  const policyAccepted = !isFreeToTalk || (policyAcceptedState.conversationId === conversation.id
    ? policyAcceptedState.accepted
    : Boolean(conversation.myMembership?.hasAcceptedPolicy))
  const canModerateFreeToTalk = isFreeToTalk &&
    (currentUser.role === 'ADMIN' || conversation.myMembership?.role === 'MODERATOR')
  const freeToTalkTagNames = new Set(['doubt', 'help', 'academic', 'feedback', 'general'])
  const availableTags = isFreeToTalk
    ? MESSAGE_TAGS.filter(({ name }) => freeToTalkTagNames.has(name))
    : MESSAGE_TAGS
  const otherMember = conversation.otherMember
  const isFaculty = currentUser.role === 'FACULTY' || currentUser.role === 'ADMIN'
  const isReadOnly = conversation.isReadOnly && !isFaculty
  const canSend = !isReadOnly

  // Determine if this is a student-to-faculty chat to show academic query options
  const isStudentToFaculty =
    currentUser.role === 'STUDENT' && isDirect && otherMember?.role === 'FACULTY'

  const acceptSafetyNotice = async () => {
    setPolicyAccepting(true)
    setPolicyError('')
    try {
      await api.acceptFreeToTalkPolicy(conversation.id)
      setPolicyAcceptedState({ conversationId: conversation.id, accepted: true })
    } catch (err) {
      setPolicyError(err.message || 'Could not record your acknowledgement.')
    } finally {
      setPolicyAccepting(false)
    }
  }

  // Fetch messages for conversation
  const fetchMessages = useCallback(async (tag = activeTag, search = debouncedSearch) => {
    if (isFreeToTalk && !policyAccepted) return
    const requestId = ++fetchRequestRef.current
    try {
      setLoading(true)
      setMessageError('')
      const data = await api.getMessages(conversation.id, {
        ...(tag && { tag }),
        ...(search && { search }),
      })
      if (requestId !== fetchRequestRef.current) return
      setMessages(data.messages || [])
      try {
        await api.markConversationRead(conversation.id)
      } catch (err) {
        console.error('Failed to mark conversation as read:', err)
      }
    } catch (err) {
      console.error('Failed to load messages:', err)
      if (requestId === fetchRequestRef.current) {
        setMessageError(err.message || 'Could not load messages.')
      }
    } finally {
      if (requestId === fetchRequestRef.current) setLoading(false)
    }
  }, [activeTag, conversation.id, debouncedSearch, isFreeToTalk, policyAccepted])

  useEffect(() => {
    if (policyAccepted) joinConversationRoom(conversation.id)

    return () => {
      fetchRequestRef.current += 1
      leaveConversationRoom(conversation.id)
    }
  }, [conversation.id, policyAccepted])

  useEffect(() => {
    if (!focusComposerOnOpen || !window.matchMedia('(max-width: 768px)').matches) return undefined
    const focusFrame = window.requestAnimationFrame(() => {
      composerInputRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(focusFrame)
  }, [conversation.id, focusComposerOnOpen])

  useEffect(() => () => {
    if (voiceRecordingTimerRef.current) clearTimeout(voiceRecordingTimerRef.current)
    if (voiceRecorderRef.current?.state === 'recording') voiceRecorderRef.current.stop()
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchState({ conversationId: conversation.id, value: searchInChat.trim() })
    }, 250)
    return () => clearTimeout(timeout)
  }, [conversation.id, searchInChat])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active && policyAccepted) fetchMessages()
    })
    return () => {
      active = false
    }
  }, [fetchMessages, policyAccepted])

  const fetchTagCounts = useCallback(async () => {
    if (isFreeToTalk && !policyAccepted) return
    const requestId = ++tagCountRequestRef.current
    try {
      setTagCountLoading(true)
      setTagCountError('')
      const data = await api.getMessageTagCounts(conversation.id)
      if (requestId === tagCountRequestRef.current) {
        setTagCountState({ conversationId: conversation.id, counts: data.tagCounts || {} })
      }
    } catch (err) {
      console.error('Failed to load message tag counts:', err)
      if (requestId === tagCountRequestRef.current) {
        setTagCountError(err.message || 'Could not load tag counts.')
      }
    } finally {
      if (requestId === tagCountRequestRef.current) setTagCountLoading(false)
    }
  }, [conversation.id, isFreeToTalk, policyAccepted])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active && policyAccepted) fetchTagCounts()
    })
    return () => {
      active = false
      tagCountRequestRef.current += 1
    }
  }, [fetchTagCounts, policyAccepted])

  useEffect(() => {
    messageFiltersRef.current = { tag: activeTag, search: debouncedSearch }
    fetchMessagesRef.current = fetchMessages
    fetchTagCountsRef.current = fetchTagCounts
    onConversationUpdatedRef.current = onConversationUpdated
  }, [activeTag, debouncedSearch, fetchMessages, fetchTagCounts, onConversationUpdated])

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
        const { tag, search } = messageFiltersRef.current
        if (search || (tag && !(newMsg.tags || []).includes(tag))) {
          fetchMessagesRef.current?.()
        } else {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
        fetchTagCountsRef.current?.()
        api.markConversationRead(conversation.id)
      }
    }

    const handleMessageEdited = (editedMsg) => {
      if (editedMsg.conversationId === conversation.id) {
        if (messageFiltersRef.current.tag || messageFiltersRef.current.search) {
          fetchMessagesRef.current?.()
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === editedMsg.id ? editedMsg : m))
          )
        }
        fetchTagCountsRef.current?.()
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
        fetchTagCountsRef.current?.()
      }
    }

    const handleMessageModerated = ({ messageId, conversationId, action }) => {
      if (conversationId !== conversation.id) return
      setMessages((prev) => prev.map((message) => message.id !== messageId
        ? message
        : action === 'REMOVE'
          ? { ...message, isDeleted: true, content: 'This message was removed by moderators.', attachments: [] }
          : { ...message, isHidden: true, content: 'This message is hidden pending moderation.', attachments: [] }))
    }

    const handleMessagePinned = ({ messageId, isPinned }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isPinned } : m))
      )
      onConversationUpdatedRef.current?.()
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
    const onNewMessage = (e) => handleNewMessage(e.detail)
    const onMessageEdited = (e) => handleMessageEdited(e.detail)
    const onMessageDeleted = (e) => handleMessageDeleted(e.detail)
    const onMessageModerated = (e) => handleMessageModerated(e.detail)
    const onMessagePinned = (e) => handleMessagePinned(e.detail)
    const onUserTyping = (e) => handleUserTyping(e.detail)
    const onUserStoppedTyping = (e) => handleUserStoppedTyping(e.detail)
    window.addEventListener('cc_socket_new_message', onNewMessage)
    window.addEventListener('cc_socket_message_edited', onMessageEdited)
    window.addEventListener('cc_socket_message_deleted', onMessageDeleted)
    window.addEventListener('cc_socket_message_moderated', onMessageModerated)
    window.addEventListener('cc_socket_message_pinned', onMessagePinned)
    window.addEventListener('cc_socket_user_typing', onUserTyping)
    window.addEventListener('cc_socket_user_stopped_typing', onUserStoppedTyping)

    return () => {
      window.removeEventListener('cc_socket_new_message', onNewMessage)
      window.removeEventListener('cc_socket_message_edited', onMessageEdited)
      window.removeEventListener('cc_socket_message_deleted', onMessageDeleted)
      window.removeEventListener('cc_socket_message_moderated', onMessageModerated)
      window.removeEventListener('cc_socket_message_pinned', onMessagePinned)
      window.removeEventListener('cc_socket_user_typing', onUserTyping)
      window.removeEventListener('cc_socket_user_stopped_typing', onUserStoppedTyping)
    }
  }, [conversation.id, currentUser.id])

  // Handle typing status emission
  const handleInputChange = (e) => {
    setInputText(e.target.value)
    setCursorPosition(e.target.selectionStart)
    setSuggestionsDismissed(false)
    setSuggestionIndex(0)

    emitTypingStart(conversation.id)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(conversation.id)
    }, 2000)
  }

  const stageAttachment = async (file) => {
    if (!file) return

    setUploadingFile(true)
    try {
      const res = await api.uploadAttachment(file)
      setStagedFiles((prev) => [...prev, res])
    } catch (err) {
      alert(`File upload failed: ${err.message}`)
    } finally {
      setUploadingFile(false)
    }
  }

  // File Upload
  const handleFileUpload = async (e) => {
    await stageAttachment(e.target.files?.[0])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleVoiceRecording = async () => {
    if (isRecordingVoice) {
      if (voiceRecordingTimerRef.current) clearTimeout(voiceRecordingTimerRef.current)
      if (voiceRecorderRef.current?.state === 'recording') voiceRecorderRef.current.stop()
      setIsRecordingVoice(false)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessageError('Voice recording is not supported by this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      voiceStreamRef.current = stream
      const supportedMimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType))
      const recorder = new MediaRecorder(stream, supportedMimeType ? { mimeType: supportedMimeType } : undefined)
      const chunks = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onerror = () => {
        setMessageError('Voice recording failed. Please try again.')
        stream.getTracks().forEach((track) => track.stop())
        voiceStreamRef.current = null
        setIsRecordingVoice(false)
      }
      recorder.onstop = async () => {
        if (voiceRecordingTimerRef.current) clearTimeout(voiceRecordingTimerRef.current)
        stream.getTracks().forEach((track) => track.stop())
        voiceStreamRef.current = null
        voiceRecorderRef.current = null
        if (!chunks.length) return
        const mimeType = recorder.mimeType || 'audio/webm'
        const extension = mimeType.includes('ogg') ? 'ogg' : 'webm'
        const voiceNote = new File(chunks, `voice-note-${Date.now()}.${extension}`, { type: mimeType })
        setMessageError('')
        await stageAttachment(voiceNote)
      }
      voiceRecorderRef.current = recorder
      recorder.start()
      setMessageError('')
      setIsRecordingVoice(true)
      voiceRecordingTimerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop()
          setIsRecordingVoice(false)
        }
      }, 120000)
    } catch (error) {
      setMessageError(error.name === 'NotAllowedError'
        ? 'Allow microphone access in your browser to record a voice note.'
        : error.message || 'Could not start voice recording.')
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
      voiceStreamRef.current = null
    }
  }

  const removeStagedFile = (idx) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  // Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault()
    const aiRequest = inputText.trim().match(/@ai\b\s*[-,:]?\s*([\s\S]*)$/i)
    if (aiRequest) {
      const prompt = aiRequest[1].trim()
      if (!prompt) {
        setMessageError('Type your question after @AI to ask privately.')
        return
      }
      if (stagedFiles.length > 0) {
        setMessageError('Attachments are not sent to Personal AI. Remove them or send your message to the chat instead.')
        return
      }
      setInputText('')
      setCursorPosition(0)
      setMessageError('')
      setShowEmojiPicker(false)
      setSuggestionsDismissed(false)
      emitTypingStop(conversation.id)
      onAskPersonalAI?.(prompt)
      return
    }
    if ((!inputText.trim() && stagedFiles.length === 0) || !canSend ||
      !policyAccepted || invalidDraftTags.length > 0 ||
      (isFreeToTalk && conversation.myMembership?.messagingRestrictedUntil &&
        new Date(conversation.myMembership.messagingRestrictedUntil) > new Date())) return

    const failedDraft = {
      inputText,
      stagedFiles,
      replyingTo,
      queryCategory,
    }
    const payload = {
      content: inputText.trim(),
      tags: draftTags,
      replyToId: replyingTo?.id || undefined,
      queryCategory: queryCategory || undefined,
      attachments: stagedFiles,
    }

    // Clear inputs immediately
    setInputText('')
    setCursorPosition(0)
    setStagedFiles([])
    setReplyingTo(null)
    setQueryCategory('')
    setShowEmojiPicker(false)
    emitTypingStop(conversation.id)

    try {
      const res = await api.sendMessage(conversation.id, payload)
      if (activeTag || debouncedSearch) {
        fetchMessages()
      } else {
        setMessages((prev) => [...prev, res.message])
      }
      fetchTagCounts()
      onConversationUpdated?.()
    } catch (err) {
      setInputText(failedDraft.inputText)
      setStagedFiles(failedDraft.stagedFiles)
      setReplyingTo(failedDraft.replyingTo)
      setQueryCategory(failedDraft.queryCategory)
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

  const draftTagNames = [...inputText.matchAll(/(?:^|[^\w])#([a-z][a-z0-9_-]{0,31})/gi)]
    .map((match) => match[1].toLowerCase())
  const draftTags = [...new Set(draftTagNames.filter((tag) => availableTags.some(({ name }) => name === tag)))]
  const invalidDraftTags = [...new Set(draftTagNames.filter((tag) => !availableTags.some(({ name }) => name === tag)))]
  const triggerMatch = inputText.slice(0, cursorPosition).match(/(?:^|[^\w])([#@][\w-]*)$/)
  const triggerToken = triggerMatch?.[1] || ''
  const mentionMembers = [...(conversation.members || []), ...(conversation.otherMember ? [conversation.otherMember] : [])]
    .map((member) => member.user || member)
    .filter((member, index, members) =>
      member.id !== currentUser.id && member.username &&
      members.findIndex((candidate) => candidate.id === member.id) === index
    )
  const suggestions = triggerToken.startsWith('#')
    ? availableTags.filter(({ name }) => name.startsWith(triggerToken.slice(1).toLowerCase()))
        .map((tag) => ({ ...tag, value: `#${tag.name}`, kind: 'tag' }))
    : triggerToken.startsWith('@') && !isFreeToTalk
      ? mentionMembers
          .filter((member) => `${member.username} ${member.fullName || ''}`.toLowerCase()
            .includes(triggerToken.slice(1).toLowerCase()))
          .map((member) => ({
            name: member.fullName || member.username,
            description: `@${member.username}`,
            value: `@${member.username}`,
            category: member.role || 'Member',
            kind: 'mention',
          }))
      : []
  const showSuggestions = Boolean(triggerToken && suggestions.length && !suggestionsDismissed)
  const displayedMessages = messages

  const selectSuggestion = (suggestion) => {
    const cursor = cursorPosition
    const beforeCursor = inputText.slice(0, cursor)
    const tokenMatch = beforeCursor.match(/(?:^|[^\w])([#@][\w-]*)$/)
    if (!tokenMatch) return
    const tokenStart = tokenMatch.index + tokenMatch[0].length - tokenMatch[1].length
    const replacement = `${suggestion.value} `
    const updatedText = `${inputText.slice(0, tokenStart)}${replacement}${inputText.slice(cursor)}`
    const updatedCursor = tokenStart + replacement.length
    setInputText(updatedText)
    setCursorPosition(updatedCursor)
    setSuggestionsDismissed(false)
    setSuggestionIndex(0)
  }

  const removeDraftTag = (tag) => {
    const updatedText = inputText
      .replace(new RegExp(`(^|[^\\w])#${tag}(?=$|[^\\w])`, 'i'), '$1')
      .replace(/[ \t]{2,}/g, ' ')
    setInputText(updatedText)
    setCursorPosition(updatedText.length)
  }

  const renderMessageText = (message) => {
    const content = message.content || ''
    const tags = new Set(message.tags || [])
    return content.split(/(#[a-z][a-z0-9_-]*)/gi).map((part, index) => {
      if (!part.startsWith('#')) return part
      const tag = part.slice(1).toLowerCase()
      if (!tags.has(tag)) return part
      const tagInfo = MESSAGE_TAGS.find(({ name }) => name === tag)
      return (
        <button
          key={`${part}-${index}`}
          type="button"
          className="cc-inline-message-tag"
          data-tag-category={tagInfo?.category.toLowerCase()}
          data-tag-name={tagInfo?.name}
          style={tagInfo ? { '--cc-tag-color': tagInfo.color } : undefined}
          aria-label={`Show messages tagged ${part}`}
          onClick={() => setActiveTag(tag)}
        >
          {part}
        </button>
      )
    })
  }

  const pinnedMsg = messages.find((m) => m.isPinned) || conversation.pinnedMessage

  return (
    <div className="cc-chat-window">
      {/* 1. CHAT HEADER */}
      <div className="cc-chat-header">
        <div className="cc-chat-header-info">
          <div className="cc-header-avatar-box">
            {isDirect ? (
              <>
                <img
                  src={getFullMediaUrl(otherMember?.avatarUrl) || getDefaultAvatar(otherMember?.fullName, otherMember?.role)}
                  alt={`${otherMember?.fullName || 'User'}'s profile`}
                  className="cc-avatar-md"
                />
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
              <h3>{isFreeToTalk ? 'Free to Talk!!' : conversation.title || otherMember?.fullName || 'Conversation'}</h3>
              {otherMember?.role && (
                <span className={`cc-role-badge ${otherMember.role === 'FACULTY' ? 'badge-faculty' : 'badge-student'}`}>
                  {otherMember.role === 'FACULTY' ? 'Faculty' : 'Student'}
                </span>
              )}
              {conversation.type === 'ANNOUNCEMENT' && (
                <span className="cc-role-badge badge-announcement">Broadcast</span>
              )}
              {isFreeToTalk && <span className="cc-role-badge cc-anonymous-badge">Anonymous chat</span>}
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
                  {isFreeToTalk
                    ? `${conversation.memberCount || 0} college members • your identity is hidden`
                    : `${conversation.members?.length || 0} members • ${conversation.department || 'Campus'}`}
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

          {isFreeToTalk && (
            <>
              <button
                type="button"
                className="cc-icon-btn"
                title="Your private moderation history and appeals"
                aria-label="Your moderation history and appeals"
                onClick={() => setShowAppealsPanel(true)}
              >
                <MessageCircleMore size={18} />
              </button>
              {canModerateFreeToTalk && (
                <button
                  type="button"
                  className="cc-icon-btn"
                  title="Review anonymous reports"
                  aria-label="Review anonymous reports"
                  onClick={() => setShowModerationPanel(true)}
                >
                  <Shield size={18} />
                </button>
              )}
            </>
          )}

          <button
            className="cc-icon-btn"
            title={conversation.myMembership?.isMuted ? 'Unmute' : 'Mute'}
            onClick={handleToggleMute}
          >
            {conversation.myMembership?.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {!isDirect && !isFreeToTalk && (
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
            placeholder={isFreeToTalk
              ? 'Search messages or #tags...'
              : 'Search messages, #tags, people, or subjects...'}
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

      <div className="cc-message-tag-filters" aria-label="Filter messages by hashtag">
        <div className="cc-message-tag-filter-heading">
          <span>Filter by tag</span>
          {tagCountLoading && <span className="cc-tag-count-status">Updating...</span>}
          {!tagCountLoading && tagCountError && (
            <button type="button" className="cc-tag-count-retry" onClick={fetchTagCounts}>
              Counts unavailable - retry
            </button>
          )}
        </div>
        <div className="cc-message-tag-filter-list">
          <button
            type="button"
            className={`cc-tag-chip cc-tag-filter-chip ${!activeTag ? 'selected' : ''}`}
            aria-pressed={!activeTag}
            onClick={() => setActiveTag('')}
          >
            All
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag.name}
              type="button"
              className={`cc-tag-chip cc-tag-filter-chip ${activeTag === tag.name ? 'selected' : ''}`}
              data-tag-category={tag.category.toLowerCase()}
              data-tag-name={tag.name}
              style={{ '--cc-tag-color': tag.color }}
              aria-pressed={activeTag === tag.name}
              onClick={() => setActiveTag(activeTag === tag.name ? '' : tag.name)}
            >
              #{tag.name}
              <span className="cc-tag-count">{tagCounts[tag.name] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* PINNED MESSAGE BANNER */}
      {pinnedMsg && (
        <div className="cc-pinned-banner">
          <Pin size={16} className="text-emerald-400" />
          <div className="cc-pinned-text">
            <strong>Pinned Message: </strong>
            <span>{pinnedMsg.content}</span>
          </div>
          {(isFreeToTalk ? canModerateFreeToTalk : isFaculty) && (
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
        ) : messageError ? (
          <div className="cc-tag-filter-state" role="alert">
            <h3>Messages could not be loaded</h3>
            <p>{messageError}</p>
            <button type="button" className="cc-btn cc-btn-secondary cc-btn-xs" onClick={() => fetchMessages()}>
              Try again
            </button>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="cc-empty-state">
            {activeTag || debouncedSearch ? (
              <div className="cc-tag-filter-state">
                <Sparkles size={32} />
                <h3>No matching messages</h3>
                <p>Try another hashtag or search term, or clear your filters.</p>
                <button
                  type="button"
                  className="cc-btn cc-btn-secondary cc-btn-xs"
                  onClick={() => {
                    setActiveTag('')
                    setSearchInChat('')
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <Sparkles size={40} className="text-emerald-400" />
                <h3>Start the conversation</h3>
                <p>Send a message, ask an academic question, or share study materials.</p>
              </>
            )}
          </div>
        ) : (
          displayedMessages.map((msg) => {
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
                {isOther && !isDirect && !isFreeToTalk && (
                  <img
                    src={getFullMediaUrl(sender?.avatarUrl) || getDefaultAvatar(sender?.fullName, sender?.role)}
                    alt=""
                    className="cc-msg-avatar"
                    title={sender?.fullName}
                  />
                )}

                <div className="cc-bubble-wrap">
                  {/* Sender Name & Role Badge in Groups */}
                  {isOther && !isDirect && !isFreeToTalk && (
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
                        <p className="cc-message-text">{renderMessageText(msg)}</p>

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="cc-message-attachments">
                            {msg.attachments.map((att) => (
                              att.fileType === 'IMAGE' ? (
                                <a
                                  key={att.id}
                                  href={getFullMediaUrl(att.fileUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cc-message-image-link"
                                >
                                  <img src={getFullMediaUrl(att.fileUrl)} alt={att.fileName} className="cc-message-image" />
                                </a>
                              ) : att.fileType === 'AUDIO' ? (
                                <div key={att.id} className="cc-audio-attachment">
                                  <strong>{att.fileName}</strong>
                                  <audio controls preload="metadata" src={getFullMediaUrl(att.fileUrl)}>
                                    Your browser does not support audio playback.
                                  </audio>
                                </div>
                              ) : (
                                <div key={att.id} className="cc-attachment-card">
                                  <FileText size={24} className="text-emerald-400" />
                                  <div className="cc-att-info">
                                    <strong>{att.fileName}</strong>
                                    <small>{att.fileSize || att.fileType}</small>
                                  </div>
                                  <a
                                    href={getFullMediaUrl(att.fileUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cc-icon-btn cc-btn-download"
                                    title="Download / View"
                                  >
                                    <Download size={16} />
                                  </a>
                                </div>
                              )
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

                      {(!isFreeToTalk || canModerateFreeToTalk) && <button
                        className="cc-toolbar-btn"
                        title={msg.isPinned ? 'Unpin' : 'Pin'}
                        onClick={() => handleTogglePin(msg.id)}
                      >
                        <Pin size={14} />
                      </button>}

                      {(isMe || (!isFreeToTalk && isFaculty)) && (
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
      ) : isFreeToTalk && !policyAccepted ? (
        <div className="cc-ftt-locked-composer">
          <ShieldAlert size={18} />
          <span>Review and accept the community safety notice to participate.</span>
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
          {!isFreeToTalk && stagedFiles.length > 0 && (
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

          {showSuggestions && (
            <div className="cc-tag-suggestion-menu" role="listbox" aria-label="Tag and mention suggestions">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.kind}-${suggestion.value}`}
                  type="button"
                  role="option"
                  aria-selected={index === suggestionIndex}
                  className={`cc-tag-suggestion ${index === suggestionIndex ? 'active' : ''}`}
                  data-tag-category={suggestion.category.toLowerCase()}
                  data-tag-name={suggestion.kind === 'tag' ? suggestion.name : undefined}
                  style={suggestion.kind === 'tag' ? { '--cc-tag-color': suggestion.color } : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <span className="cc-tag-suggestion-name">
                    {suggestion.kind === 'mention' ? suggestion.name : suggestion.value}
                  </span>
                  <span className="cc-tag-suggestion-description">{suggestion.description}</span>
                </button>
              ))}
            </div>
          )}

          {draftTags.length > 0 && (
            <div className="cc-draft-tags" aria-label="Tags on this message">
              <span>Tags</span>
              {draftTags.map((tagName) => {
                const tagInfo = MESSAGE_TAGS.find(({ name }) => name === tagName)
                return (
                  <span
                    key={tagName}
                    className="cc-tag-chip cc-draft-tag"
                    data-tag-category={tagInfo?.category.toLowerCase()}
                    data-tag-name={tagName}
                    style={tagInfo ? { '--cc-tag-color': tagInfo.color } : undefined}
                  >
                    #{tagName}
                    <button
                      type="button"
                      aria-label={`Remove #${tagName}`}
                      onClick={() => removeDraftTag(tagName)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
          {invalidDraftTags.length > 0 && (
            <p className="cc-tag-validation-error" role="alert">
              Unsupported hashtag{invalidDraftTags.length > 1 ? 's' : ''}: {invalidDraftTags.map((tag) => `#${tag}`).join(', ')}.
              Choose one of the suggested tags.
            </p>
          )}

          <form onSubmit={handleSendMessage} className="cc-composer-form">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.zip,.webm,.ogg,.mp3,.wav,.m4a,audio/*"
            />

            {!isFreeToTalk && <button
              type="button"
              className="cc-composer-btn"
              title="Attach PDF, Document or Image"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
            >
              <Paperclip size={18} />
            </button>}

            {!isFreeToTalk && (
              <button
                type="button"
                className={`cc-composer-btn ${isRecordingVoice ? 'active cc-recording-voice' : ''}`}
                title={isRecordingVoice ? 'Stop recording voice note' : 'Record a voice note'}
                aria-label={isRecordingVoice ? 'Stop recording voice note' : 'Record a voice note'}
                onClick={toggleVoiceRecording}
                disabled={uploadingFile}
              >
                {isRecordingVoice ? <Square size={17} /> : <Mic size={18} />}
              </button>
            )}

            <button
              type="button"
              className={`cc-composer-btn ${showEmojiPicker ? 'active' : ''}`}
              title="Emojis"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={18} />
            </button>

            <textarea
              ref={composerInputRef}
              className="cc-composer-input"
              placeholder={isFreeToTalk
                ? 'Speak freely... Type # for a topic tag (Enter to send)'
                : isStudentToFaculty
                  ? 'Ask your professor... Type @AI for a private answer'
                  : 'Type a message... Type @AI for a private answer'}
              value={inputText}
              onChange={handleInputChange}
              onSelect={(e) => setCursorPosition(e.target.selectionStart)}
              onKeyDown={(e) => {
                if (showSuggestions && e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSuggestionIndex((index) => (index + 1) % suggestions.length)
                  return
                }
                if (showSuggestions && e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSuggestionIndex((index) => (index - 1 + suggestions.length) % suggestions.length)
                  return
                }
                if (showSuggestions && e.key === 'Escape') {
                  e.preventDefault()
                  setSuggestionsDismissed(true)
                  return
                }
                if (showSuggestions && e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  selectSuggestion(suggestions[suggestionIndex])
                  return
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              rows={1}
              aria-label="Message input"
            />

            <button
              type="submit"
              className="cc-send-btn"
              disabled={(!inputText.trim() && stagedFiles.length === 0) || uploadingFile || isRecordingVoice ||
                (isFreeToTalk && conversation.myMembership?.messagingRestrictedUntil &&
                  new Date(conversation.myMembership.messagingRestrictedUntil) > new Date())}
            >
              <Send size={18} />
            </button>
          </form>
          {messageError && <p className="cc-composer-error" role="alert">{messageError}</p>}

        </div>
      )}

      {isFreeToTalk && !policyAccepted && (
        <div className="cc-ftt-policy-overlay">
          <section
            className="cc-ftt-policy-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cc-ftt-policy-title"
          >
            <div className="cc-ftt-policy-icon"><MessageCircleMore size={24} /></div>
            <h2 id="cc-ftt-policy-title">Welcome to Free to Talk!!</h2>
            <p className="cc-ftt-policy-notice">
              {conversation.policyNotice}
            </p>
            <h3>Keep the community safe</h3>
            <ul>
              <li>Be respectful. Harassment, threats, hate speech, spam, impersonation, doxxing, and retaliation are not allowed.</li>
              <li>Do not share passwords, private records, confidential exam materials, or another person's personal information.</li>
              <li>Do not post illegal or harmful material, malicious links, or content that enables wrongdoing.</li>
              <li>Use the topic tags, keep discussions constructive, and report harmful content instead of retaliating.</li>
              <li>Messages may be retained and reviewed for moderation. Screenshots or redistribution cannot be technically prevented.</li>
            </ul>
            {policyError && <p className="cc-error-box" role="alert">{policyError}</p>}
            <button
              type="button"
              className="cc-btn cc-btn-primary"
              disabled={policyAccepting}
              onClick={acceptSafetyNotice}
            >
              {policyAccepting ? 'Saving acknowledgement...' : 'I understand — enter Whisper'}
            </button>
          </section>
        </div>
      )}

      {showModerationPanel && (
        <FreeToTalkModerationPanel
          conversation={conversation}
          currentUser={currentUser}
          onClose={() => setShowModerationPanel(false)}
        />
      )}
      {showAppealsPanel && (
        <FreeToTalkAppeals onClose={() => setShowAppealsPanel(false)} />
      )}
    </div>
  )
}
