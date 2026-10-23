import { useState, useEffect } from 'react'
import { Bell, Pin, FileText, Calendar, Send, ShieldAlert, ArrowRight, User } from 'lucide-react'
import { api, getFullMediaUrl } from '../../services/api'

export default function AnnouncementsBoard({ currentUser, onOpenAnnouncementChat }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const isFaculty = currentUser.role === 'FACULTY' || currentUser.role === 'ADMIN'

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const data = await api.getConversations()
      const convs = data.conversations || []
      // Filter for ANNOUNCEMENT conversations
      const annConvs = convs.filter((c) => c.type === 'ANNOUNCEMENT')
      setAnnouncements(annConvs)
    } catch (err) {
      console.error('Error fetching announcements:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  return (
    <div className="cc-directory-page">
      <div className="cc-directory-header">
        <div>
          <h2>Official College Announcements 📢</h2>
          <p>Verified department notices, assignment schedules, examination alerts, and circulars.</p>
        </div>
      </div>

      {loading ? (
        <div className="cc-loading-center">
          <div className="cc-spinner" />
          <p>Loading announcement bulletins...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="cc-empty-state">
          <Bell size={40} className="text-emerald-400" />
          <h3>No Active Announcement Channels</h3>
          <p>Official faculty circulars and deadlines will appear here once published.</p>
        </div>
      ) : (
        <div className="cc-announcements-list">
          {announcements.map((ann) => {
            const latest = ann.latestMessage
            const pinned = ann.pinnedMessage

            return (
              <div key={ann.id} className="cc-announcement-card">
                <div className="cc-announcement-card-header">
                  <div className="cc-ann-title-wrap">
                    <div className="cc-ann-icon-box">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <h3>{ann.title}</h3>
                      <div className="cc-ann-meta-tags">
                        {ann.department && <span className="cc-mini-tag">{ann.department}</span>}
                        {ann.semester && <span className="cc-mini-tag">{ann.semester}</span>}
                        <span className="cc-mini-tag cc-official-tag">Official Channel</span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="cc-btn cc-btn-primary cc-btn-sm"
                    onClick={() => onOpenAnnouncementChat(ann)}
                  >
                    <span>Open Channel</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {pinned && (
                  <div className="cc-pinned-alert-strip">
                    <Pin size={15} />
                    <div>
                      <strong>PINNED NOTICE: </strong>
                      <span>{pinned.content}</span>
                    </div>
                  </div>
                )}

                {latest ? (
                  <div className="cc-ann-latest-message">
                    <div className="cc-ann-author-row">
                      <User size={14} />
                      <span>{latest.sender?.fullName || 'Faculty Member'}</span>
                      <small>• {new Date(latest.createdAt).toLocaleDateString()} at {new Date(latest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                    </div>
                    <p className="cc-ann-text">{latest.content}</p>

                    {latest.attachments && latest.attachments.length > 0 && (
                      <div className="cc-ann-attachments">
                        {latest.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={getFullMediaUrl(att.fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cc-ann-attachment-pill"
                          >
                            <FileText size={14} />
                            <span>{att.fileName}</span>
                            <small>({att.fileSize})</small>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="cc-text-muted">No messages posted in this channel yet.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
