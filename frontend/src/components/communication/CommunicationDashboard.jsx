import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Users,
  GraduationCap,
  BookOpen,
  Bell,
  Settings,
  Plus,
  ArrowLeft,
  ChevronRight,
  Shield,
  CheckCircle,
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
import { api } from '../../services/api'
import { getSocket, connectSocket } from '../../services/socket'

export default function CommunicationDashboard({ currentUser, onProfileUpdated }) {
  // Navigation tabs in the Communication Module
  // 'CHATS' | 'FACULTY_DIR' | 'STUDENT_DIR' | 'ANNOUNCEMENTS' | 'SETTINGS'
  const [activeTab, setActiveTab] = useState('CHATS')

  // Conversations state
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [loadingConversations, setLoadingConversations] = useState(true)

  // Modals state
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [reportingMessage, setReportingMessage] = useState(null)

  // Mobile responsiveness
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  // Online users set from Socket.IO
  const [onlineUserIds, setOnlineUserIds] = useState(new Set())

  // Fetch all conversations for current user
  const fetchConversations = async (preserveActiveId = null) => {
    try {
      setLoadingConversations(true)
      const data = await api.getConversations()
      const convList = data.conversations || []
      setConversations(convList)

      // Set active conversation if none or preserve
      if (preserveActiveId) {
        const found = convList.find((c) => c.id === preserveActiveId)
        if (found) setActiveConversation(found)
      } else if (!activeConversation && convList.length > 0) {
        setActiveConversation(convList[0])
      }
    } catch (err) {
      console.error('Error fetching conversations:', err)
    } finally {
      setLoadingConversations(false)
    }
  }

  // Socket.IO setup & listeners
  useEffect(() => {
    connectSocket(currentUser)
    const socket = getSocket()

    const onOnlineUsers = (users) => {
      setOnlineUserIds(new Set(users))
    }

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

    socket.on('online_users', onOnlineUsers)
    socket.on('new_message', onNewMessage)
    socket.on('message_edited', onMessageEdited)
    socket.on('message_deleted', onMessageDeleted)
    socket.on('message_pinned', onMessagePinned)
    socket.on('user_typing', onUserTyping)
    socket.on('user_stopped_typing', onUserStoppedTyping)
    socket.on('conversation_created', onConversationCreated)

    fetchConversations()

    return () => {
      socket.off('online_users', onOnlineUsers)
      socket.off('new_message', onNewMessage)
      socket.off('message_edited', onMessageEdited)
      socket.off('message_deleted', onMessageDeleted)
      socket.off('message_pinned', onMessagePinned)
      socket.off('user_typing', onUserTyping)
      socket.off('user_stopped_typing', onUserStoppedTyping)
      socket.off('conversation_created', onConversationCreated)
    }
  }, [currentUser.id])

  // Handlers for switching views & opening chats
  const handleSelectConversation = (conv) => {
    setActiveConversation(conv)
    setActiveTab('CHATS')
    setMobileChatOpen(true)
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

  const totalUnreadCount = conversations.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0
  )

  return (
    <div className="cc-comm-dashboard">
      {/* 1. LEFT SUB-NAVBAR (MICROSOFT TEAMS STYLE BAR) */}
      <nav className="cc-comm-subnav">
        <button
          className={`cc-subnav-item ${activeTab === 'CHATS' ? 'active' : ''}`}
          onClick={() => setActiveTab('CHATS')}
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
                conversations={conversations}
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
                  conversation={activeConversation}
                  currentUser={currentUser}
                  onOpenGroupInfo={() => setShowGroupInfo(true)}
                  onOpenReportModal={(msg) => setReportingMessage(msg)}
                  onConversationUpdated={() => fetchConversations(activeConversation.id)}
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

        {activeTab === 'FACULTY_DIR' && (
          <FacultyDirectory
            currentUser={currentUser}
            onStartConversation={handleStartConversationFromDirectory}
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
          onClose={() => setReportingMessage(null)}
          onReportSuccess={() => {
            fetchConversations(activeConversation?.id)
          }}
        />
      )}
    </div>
  )
}
