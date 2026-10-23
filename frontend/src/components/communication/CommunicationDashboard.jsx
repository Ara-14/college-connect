import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Users,
  GraduationCap,
  BookOpen,
  Bell,
  MessageCircleMore,
  Settings,
  Plus,
  ArrowLeft,
  ChevronRight,
  Shield,
  CheckCircle,
  Sparkles,
} from 'lucide-react'
import ConversationList from './ConversationList'
import ChatWindow from './ChatWindow'
import FacultyDirectory from './FacultyDirectory'
import StudentDirectory from './StudentDirectory'
import AnnouncementsBoard from './AnnouncementsBoard'
import CommunicationSettings from './CommunicationSettings'
import CreateGroupModal from './CreateGroupModal'
import GroupInfoModal from './GroupInfoModal'
import ReportModal from './ReportModal'
import PersonalAI from './PersonalAI'
import { api } from '../../services/api'
import { getSocket, connectSocket } from '../../services/socket'

export default function CommunicationDashboard({
  currentUser,
  onProfileUpdated,
  personalAIRequest,
  onAskPersonalAI,
  onPersonalAIRequestHandled,
}) {
  // Navigation tabs in the Communication Module
  // 'CHATS' | 'FACULTY_DIR' | 'STUDENT_DIR' | 'ANNOUNCEMENTS' | 'WHISPER' | 'SETTINGS'
  const [activeTab, setActiveTab] = useState(() => personalAIRequest ? 'PERSONAL_AI' : 'CHATS')
  const [aiRequest, setAiRequest] = useState(personalAIRequest)

  // Conversations state
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [whisperLoading, setWhisperLoading] = useState(false)
  const [whisperError, setWhisperError] = useState('')

  // Modals state
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [reportingMessage, setReportingMessage] = useState(null)

  // Mobile responsiveness
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  // Fetch all conversations for current user
  const fetchConversations = async (preserveActiveId = null) => {
    try {
      setLoadingConversations(true)
      const data = await api.getConversations()
      const convList = data.conversations || []
      setConversations(convList)
      const chatConversations = convList.filter((conversation) => !conversation.isFreeToTalk)

      // Set active conversation if none or preserve
      if (preserveActiveId) {
        const found = convList.find((c) => c.id === preserveActiveId)
        if (found) setActiveConversation(found)
      } else if (!activeConversation && chatConversations.length > 0) {
        setActiveConversation(chatConversations[0])
      }
    } catch (err) {
      console.error('Error fetching conversations:', err)
    } finally {
      setLoadingConversations(false)
    }
  }

  // Socket.IO setup & listeners
  useEffect(() => {
    connectSocket()
    const socket = getSocket()

    const onNewMessage = (msg) => {
      // Dispatch custom DOM event for ChatWindow
      window.dispatchEvent(new CustomEvent('cc_socket_new_message', { detail: msg }))
      // Refresh conversation list to update latest message and unread count
      fetchConversations(activeConversation?.id)
    }

    const onMessageEdited = (msg) => {
      window.dispatchEvent(new CustomEvent('cc_socket_message_edited', { detail: msg }))
    }

    const onMessageDeleted = (data) => {
      window.dispatchEvent(new CustomEvent('cc_socket_message_deleted', { detail: data }))
    }

    const onMessageModerated = (data) => {
      window.dispatchEvent(new CustomEvent('cc_socket_message_moderated', { detail: data }))
    }

    const onMessagePinned = (data) => {
      window.dispatchEvent(new CustomEvent('cc_socket_message_pinned', { detail: data }))
    }

    const onUserTyping = (data) => {
      window.dispatchEvent(new CustomEvent('cc_socket_user_typing', { detail: data }))
    }

    const onUserStoppedTyping = (data) => {
      window.dispatchEvent(new CustomEvent('cc_socket_user_stopped_typing', { detail: data }))
    }

    const onConversationCreated = (conv) => {
      fetchConversations(conv.id)
    }

    socket.on('new_message', onNewMessage)
    socket.on('message_edited', onMessageEdited)
    socket.on('message_deleted', onMessageDeleted)
    socket.on('message_moderated', onMessageModerated)
    socket.on('message_pinned', onMessagePinned)
    socket.on('user_typing', onUserTyping)
    socket.on('user_stopped_typing', onUserStoppedTyping)
    socket.on('conversation_created', onConversationCreated)

    fetchConversations()

    return () => {
      socket.off('new_message', onNewMessage)
      socket.off('message_edited', onMessageEdited)
      socket.off('message_deleted', onMessageDeleted)
      socket.off('message_moderated', onMessageModerated)
      socket.off('message_pinned', onMessagePinned)
      socket.off('user_typing', onUserTyping)
      socket.off('user_stopped_typing', onUserStoppedTyping)
      socket.off('conversation_created', onConversationCreated)
    }
  }, [currentUser.id])

  // Handlers for switching views & opening chats
  const handleSelectConversation = (conv) => {
    if (conv.isFreeToTalk) return
    setActiveConversation(conv)
    setActiveTab('CHATS')
    setMobileChatOpen(true)
  }

  const openChats = () => {
    if (activeConversation?.isFreeToTalk) {
      setActiveConversation(conversations.find((conversation) => !conversation.isFreeToTalk) || null)
    }
    setActiveTab('CHATS')
    setMobileChatOpen(false)
  }

  const openPersonalAI = () => {
    setActiveTab('PERSONAL_AI')
    setMobileChatOpen(false)
  }

  const handleAskPersonalAI = (prompt) => {
    setAiRequest((current) => ({ id: (current?.id || 0) + 1, prompt }))
    setActiveTab('PERSONAL_AI')
    setMobileChatOpen(false)
    onAskPersonalAI?.(prompt)
  }

  const handleStartConversationFromDirectory = (conv) => {
    setActiveConversation(conv)
    setActiveTab('CHATS')
    setMobileChatOpen(true)
    fetchConversations(conv.id)
  }

  const handleGroupCreated = (newConv) => {
    setActiveConversation(newConv)
    setActiveTab('CHATS')
    setMobileChatOpen(true)
    fetchConversations(newConv.id)
  }

  const openFreeToTalk = async () => {
    setActiveTab('WHISPER')
    setWhisperLoading(true)
    setWhisperError('')
    try {
      let freeToTalk = conversations.find((conversation) => conversation.isFreeToTalk)
      if (!freeToTalk) {
        const data = await api.getConversations()
        const convList = data.conversations || []
        setConversations(convList)
        freeToTalk = convList.find((conversation) => conversation.isFreeToTalk)
      }
      if (!freeToTalk) {
        setWhisperError('Whisper is not available for this account.')
        return
      }
      setActiveConversation(freeToTalk)
      setMobileChatOpen(true)
    } catch (err) {
      console.error('Could not open Free to Talk:', err)
      setWhisperError(err.message || 'Whisper could not be loaded.')
    } finally {
      setWhisperLoading(false)
    }
  }

  const chatConversations = conversations.filter((conversation) => !conversation.isFreeToTalk)
  const freeToTalkConversation = conversations.find((conversation) => conversation.isFreeToTalk)
  const totalUnreadCount = chatConversations.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0
  )

  return (
    <div className={`cc-comm-dashboard ${mobileChatOpen ? 'cc-mobile-chat-open' : ''}`}>
      {/* 1. LEFT SUB-NAVBAR (MICROSOFT TEAMS STYLE BAR) */}
      <nav className="cc-comm-subnav">
        <button
          className={`cc-subnav-item ${activeTab === 'CHATS' ? 'active' : ''}`}
          onClick={openChats}
          title="All Chats"
        >
          <div className="cc-subnav-icon-wrap">
            <MessageSquare size={20} />
            {totalUnreadCount > 0 && (
              <span className="cc-subnav-badge">{totalUnreadCount}</span>
            )}
          </div>
          <span>Chats</span>
        </button>

        <button
          className={`cc-subnav-item ${activeTab === 'PERSONAL_AI' ? 'active' : ''}`}
          onClick={() => openPersonalAI()}
          title="Personal AI"
        >
          <div className="cc-subnav-icon-wrap">
            <Sparkles size={20} />
          </div>
          <span>Personal AI</span>
        </button>

        <button
          className={`cc-subnav-item ${activeTab === 'FACULTY_DIR' ? 'active' : ''}`}
          onClick={() => setActiveTab('FACULTY_DIR')}
          title="Faculty Directory"
        >
          <div className="cc-subnav-icon-wrap">
            <GraduationCap size={20} />
          </div>
          <span>Faculty</span>
        </button>

        <button
          className={`cc-subnav-item ${activeTab === 'STUDENT_DIR' ? 'active' : ''}`}
          onClick={() => setActiveTab('STUDENT_DIR')}
          title="Student Directory"
        >
          <div className="cc-subnav-icon-wrap">
            <BookOpen size={20} />
          </div>
          <span>Students</span>
        </button>

        <button
          className={`cc-subnav-item ${activeTab === 'ANNOUNCEMENTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('ANNOUNCEMENTS')}
          title="Official Announcements"
        >
          <div className="cc-subnav-icon-wrap">
            <Bell size={20} />
          </div>
          <span>Notices</span>
        </button>

        <button
          className={`cc-subnav-item ${activeTab === 'WHISPER' ? 'active' : ''}`}
          onClick={openFreeToTalk}
          title="Free to Talk — anonymous community chat"
          aria-label="Whisper — Free to Talk"
          disabled={whisperLoading}
        >
          <div className="cc-subnav-icon-wrap">
            <MessageCircleMore size={20} />
            {freeToTalkConversation?.unreadCount > 0 && (
              <span className="cc-subnav-badge">{freeToTalkConversation.unreadCount}</span>
            )}
          </div>
          <span>Whisper</span>
        </button>

        <button
          className={`cc-subnav-item ${activeTab === 'SETTINGS' ? 'active' : ''}`}
          onClick={() => setActiveTab('SETTINGS')}
          title="Communication Preferences"
        >
          <div className="cc-subnav-icon-wrap">
            <Settings size={20} />
          </div>
          <span>Settings</span>
        </button>
      </nav>

      {/* 2. MAIN CONTENT AREA */}
      <div className="cc-comm-body">
        {activeTab === 'CHATS' && (
          <div className={`cc-chats-split-layout ${mobileChatOpen ? 'mobile-chat-view' : 'mobile-list-view'}`}>
            {/* Conversations Column */}
            <div className="cc-conv-col">
              <ConversationList
                conversations={chatConversations}
                activeConversationId={activeConversation?.id}
                onSelectConversation={handleSelectConversation}
                onOpenCreateGroup={() => setShowCreateGroup(true)}
                currentUser={currentUser}
              />
            </div>

            {/* Active Chat Window Column */}
            <div className="cc-chat-col">
              {mobileChatOpen && (
                <div className="cc-mobile-back-bar">
                  <button
                    className="cc-text-btn"
                    onClick={() => setMobileChatOpen(false)}
                  >
                    <ArrowLeft size={18} />
                    <span>Back to chats</span>
                  </button>
                </div>
              )}

              {activeConversation ? (
                <ChatWindow
                  key={activeConversation.id}
                  conversation={activeConversation}
                  currentUser={currentUser}
                  onOpenGroupInfo={() => setShowGroupInfo(true)}
                  onOpenReportModal={(msg) => setReportingMessage({
                    ...msg,
                    isFreeToTalk: activeConversation.isFreeToTalk,
                  })}
                  onConversationUpdated={() => fetchConversations(activeConversation.id)}
                  focusComposerOnOpen={mobileChatOpen}
                  onAskPersonalAI={handleAskPersonalAI}
                />
              ) : (
                <div className="cc-no-active-chat">
                  <MessageSquare size={48} className="text-emerald-400" />
                  <h3>Welcome to College Communication</h3>
                  <p>
                    Select an existing conversation, message a faculty member or peer from the directory, or create a study group.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'WHISPER' && (
          <div className="cc-chats-split-layout cc-whisper-layout">
            {whisperLoading ? (
              <div className="cc-loading-center">
                <div className="cc-spinner" />
                <p>Opening Whisper...</p>
              </div>
            ) : whisperError ? (
              <div className="cc-tag-filter-state" role="alert">
                <h3>Whisper could not be opened</h3>
                <p>{whisperError}</p>
                <button type="button" className="cc-btn cc-btn-secondary cc-btn-xs" onClick={openFreeToTalk}>
                  Try again
                </button>
              </div>
            ) : activeConversation?.isFreeToTalk ? (
              <div className="cc-chat-col">
                <ChatWindow
                  key={activeConversation.id}
                  conversation={activeConversation}
                  currentUser={currentUser}
                  onOpenGroupInfo={() => setShowGroupInfo(true)}
                  onOpenReportModal={(msg) => setReportingMessage({
                    ...msg,
                    isFreeToTalk: true,
                  })}
                  onConversationUpdated={() => fetchConversations(activeConversation.id)}
                  onAskPersonalAI={handleAskPersonalAI}
                />
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'FACULTY_DIR' && (
          <FacultyDirectory
            currentUser={currentUser}
            onStartConversation={handleStartConversationFromDirectory}
          />
        )}

        {activeTab === 'PERSONAL_AI' && (
          <PersonalAI
            request={aiRequest}
            onRequestHandled={onPersonalAIRequestHandled}
          />
        )}

        {activeTab === 'STUDENT_DIR' && (
          <StudentDirectory
            currentUser={currentUser}
            onStartConversation={handleStartConversationFromDirectory}
          />
        )}

        {activeTab === 'ANNOUNCEMENTS' && (
          <AnnouncementsBoard
            currentUser={currentUser}
            onOpenAnnouncementChat={handleStartConversationFromDirectory}
          />
        )}

        {activeTab === 'SETTINGS' && (
          <CommunicationSettings
            currentUser={currentUser}
            onProfileUpdated={onProfileUpdated}
          />
        )}
      </div>

      {/* MODALS */}
      {showCreateGroup && (
        <CreateGroupModal
          currentUser={currentUser}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}

      {showGroupInfo && activeConversation && (
        <GroupInfoModal
          conversation={activeConversation}
          currentUser={currentUser}
          onClose={() => setShowGroupInfo(false)}
          onUpdate={() => fetchConversations(activeConversation.id)}
        />
      )}

      {reportingMessage && (
        <ReportModal
          message={reportingMessage}
          isAnonymous={reportingMessage.isFreeToTalk}
          onClose={() => setReportingMessage(null)}
          onReportSuccess={() => {
            fetchConversations(activeConversation?.id)
          }}
        />
      )}
    </div>
  )
}
