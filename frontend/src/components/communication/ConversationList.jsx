import { useState } from 'react'
import { Search, Plus, MessageSquare, Users, Bell, Pin, VolumeX, Archive, Check } from 'lucide-react'

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenCreateGroup,
  currentUser,
}) {
  const [filterTab, setFilterTab] = useState('ALL') // ALL, DIRECT, GROUPS, UNREAD, ARCHIVED
  const [searchQuery, setSearchQuery] = useState('')

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const filteredConversations = conversations.filter((c) => {
    // Tab filter
    if (filterTab === 'ARCHIVED') {
      if (!c.myMembership?.isArchived) return false
    } else {
      if (c.myMembership?.isArchived) return false
    }

    if (filterTab === 'DIRECT') {
      if (c.type !== 'DIRECT' && c.type !== 'QUERY') return false
    }

    if (filterTab === 'GROUPS') {
      if (c.type !== 'GROUP' && c.type !== 'ANNOUNCEMENT') return false
    }

    if (filterTab === 'UNREAD') {
      if (c.unreadCount <= 0) return false
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const title = (c.title || c.otherMember?.fullName || '').toLowerCase()
      const lastMsg = (c.latestMessage?.content || '').toLowerCase()
      const dept = (c.department || c.otherMember?.department || '').toLowerCase()
      return title.includes(q) || lastMsg.includes(q) || dept.includes(q)
    }

    return true
  })

  return (
    <div className="cc-conv-list-panel">
      {/* Header with Search and Create button */}
      <div className="cc-conv-list-header">
        <div className="cc-conv-search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          className="cc-icon-btn cc-btn-create-chat"
          title="Create Group or Channel"
          onClick={onOpenCreateGroup}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="cc-filter-tabs">
        <button
          className={`cc-tab-pill ${filterTab === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilterTab('ALL')}
        >
          All
        </button>
        <button
          className={`cc-tab-pill ${filterTab === 'DIRECT' ? 'active' : ''}`}
          onClick={() => setFilterTab('DIRECT')}
        >
          Direct
        </button>
        <button
          className={`cc-tab-pill ${filterTab === 'GROUPS' ? 'active' : ''}`}
          onClick={() => setFilterTab('GROUPS')}
        >
          Groups
        </button>
        <button
          className={`cc-tab-pill ${filterTab === 'UNREAD' ? 'active' : ''}`}
          onClick={() => setFilterTab('UNREAD')}
        >
          Unread
        </button>
        <button
          className={`cc-tab-pill ${filterTab === 'ARCHIVED' ? 'active' : ''}`}
          onClick={() => setFilterTab('ARCHIVED')}
          title="Archived conversations"
        >
          <Archive size={14} />
        </button>
      </div>

      {/* Conversations Scroll Area */}
      <div className="cc-conv-items-scroll">
        {filteredConversations.length === 0 ? (
          <div className="cc-empty-convs">
            <MessageSquare size={32} />
            <p>No conversations found</p>
            <small>Try another filter tab or start a new chat</small>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === activeConversationId
            const isDirect = conv.type === 'DIRECT' || conv.type === 'QUERY'
            const other = conv.otherMember
            const title = conv.title || other?.fullName || 'Conversation'
            const avatar = isDirect ? other?.avatarUrl : null
            const isOnline = isDirect && other?.status === 'ONLINE'
            const role = isDirect ? other?.role : null
            const latestMsg = conv.latestMessage
            const unreadCount = conv.unreadCount || 0
            const isMuted = conv.myMembership?.isMuted
            const isPinned = Boolean(conv.pinnedMessageId)

            return (
              <div
                key={conv.id}
                className={`cc-conv-item ${isSelected ? 'selected' : ''} ${unreadCount > 0 ? 'unread' : ''}`}
                onClick={() => onSelectConversation(conv)}
              >
                {/* Avatar */}
                <div className="cc-conv-avatar-box">
                  {isDirect ? (
                    <>
                      <img src={avatar} alt="" className="cc-avatar-md" />
                      <span className={`cc-status-dot ${isOnline ? 'online' : 'offline'}`} />
                    </>
                  ) : (
                    <div className="cc-group-avatar-badge">
                      {conv.type === 'ANNOUNCEMENT' ? <Bell size={18} /> : <Users size={18} />}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="cc-conv-content">
                  <div className="cc-conv-top-row">
                    <div className="cc-conv-title-row">
                      <strong className="cc-conv-title">{title}</strong>
                      {role && (
                        <span className={`cc-role-badge ${role === 'FACULTY' ? 'badge-faculty' : 'badge-student'}`}>
                          {role === 'FACULTY' ? 'Faculty' : 'Student'}
                        </span>
                      )}
                      {conv.type === 'ANNOUNCEMENT' && (
                        <span className="cc-role-badge badge-announcement">Official</span>
                      )}
                      {conv.type === 'QUERY' && (
                        <span className="cc-role-badge badge-query">Query</span>
                      )}
                    </div>
                    <span className="cc-conv-time">
                      {latestMsg ? formatTime(latestMsg.createdAt) : ''}
                    </span>
                  </div>

                  <div className="cc-conv-bottom-row">
                    <span className="cc-conv-snippet">
                      {latestMsg ? (
                        <>
                          {latestMsg.senderId === currentUser.id ? 'You: ' : ''}
                          {latestMsg.content || 'Shared an attachment'}
                        </>
                      ) : (
                        <em className="cc-text-muted">No messages yet</em>
                      )}
                    </span>

                    <div className="cc-conv-indicators">
                      {isPinned && <Pin size={13} className="text-purple-400" />}
                      {isMuted && <VolumeX size={13} className="text-gray-500" />}
                      {unreadCount > 0 && (
                        <span className="cc-unread-badge">{unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
