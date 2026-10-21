import { useState, useEffect } from 'react'
import { Search, Mail, MessageSquare, Clock, MapPin, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react'
import { api } from '../../services/api'

export default function FacultyDirectory({ currentUser, onStartConversation }) {
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [selectedFacultyForQuery, setSelectedFacultyForQuery] = useState(null)
  const [querySubject, setQuerySubject] = useState('')
  const [queryCategory, setQueryCategory] = useState('Doubt Clarification')
  const [initialMessage, setInitialMessage] = useState('')
  const [startingChat, setStartingChat] = useState(false)
  const [errorNotice, setErrorNotice] = useState('')

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        setLoading(true)
        const data = await api.getUsers({ role: 'FACULTY' })
        setFaculty(data.users || [])
      } catch (err) {
        console.error('Error fetching faculty:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchFaculty()
  }, [])

  const departments = ['All', 'Computer Science & Engineering', 'Information Science', 'Electronics & Communication']

  const filteredFaculty = faculty.filter((f) => {
    const matchSearch =
      search === '' ||
      f.fullName.toLowerCase().includes(search.toLowerCase()) ||
      f.department.toLowerCase().includes(search.toLowerCase()) ||
      (f.bio && f.bio.toLowerCase().includes(search.toLowerCase()))

    const matchDept = departmentFilter === 'All' || f.department === departmentFilter
    return matchSearch && matchDept
  })

  const handleOpenChat = async (prof) => {
    setErrorNotice('')
    // If student messaging a faculty member with allowStudentDMs === false
    if (currentUser.role === 'STUDENT' && !prof.allowStudentDMs) {
      setErrorNotice(`${prof.fullName} has restricted direct student messages in accordance with department policy. Please check their office hours or course announcements.`)
      return
    }

    // If current user is student, prompt for query subject/category
    if (currentUser.role === 'STUDENT') {
      setSelectedFacultyForQuery(prof)
      return
    }

    // If faculty to faculty, initiate direct chat directly
    setStartingChat(true)
    try {
      const res = await api.getDirectConversation(prof.id)
      onStartConversation(res.conversation)
    } catch (err) {
      setErrorNotice(err.message || 'Failed to open conversation.')
    } finally {
      setStartingChat(false)
    }
  }

  const handleSendStudentQuery = async (e) => {
    e.preventDefault()
    if (!selectedFacultyForQuery) return
    setStartingChat(true)
    setErrorNotice('')

    try {
      // 1. Get or create conversation
      const convRes = await api.getDirectConversation(
        selectedFacultyForQuery.id,
        querySubject || 'Academic Inquiry',
        queryCategory
      )

      // 2. If initial message was provided, send it
      if (initialMessage.trim()) {
        await api.sendMessage(convRes.conversation.id, {
          content: initialMessage.trim(),
          queryCategory,
        })
      }

      setSelectedFacultyForQuery(null)
      setInitialMessage('')
      setQuerySubject('')
      onStartConversation(convRes.conversation)
    } catch (err) {
      setErrorNotice(err.message || 'Failed to send query.')
    } finally {
      setStartingChat(false)
    }
  }

  return (
    <div className="cc-directory-page">
      <div className="cc-directory-header">
        <div>
          <h2>Faculty Directory 🎓</h2>
          <p>Connect with professors, course mentors, and department heads.</p>
        </div>

        <div className="cc-directory-controls">
          <div className="cc-search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search faculty by name, department, or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="cc-dept-select"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All Departments' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorNotice && (
        <div className="cc-alert-banner cc-alert-warning">
          <AlertCircle size={20} />
          <span>{errorNotice}</span>
          <button className="cc-banner-close" onClick={() => setErrorNotice('')}>
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="cc-loading-center">
          <div className="cc-spinner" />
          <p>Loading faculty directory...</p>
        </div>
      ) : filteredFaculty.length === 0 ? (
        <div className="cc-empty-state">
          <Sparkles size={36} />
          <h3>No faculty members found</h3>
          <p>Try refining your search keyword or department filter.</p>
        </div>
      ) : (
        <div className="cc-faculty-grid">
          {filteredFaculty.map((prof) => {
            const isMe = prof.id === currentUser.id
            const canMessage = currentUser.role === 'FACULTY' || prof.allowStudentDMs

            return (
              <div key={prof.id} className="cc-faculty-card">
                <div className="cc-faculty-top">
                  <div className="cc-avatar-wrapper">
                    <img src={prof.avatarUrl} alt="" className="cc-faculty-avatar" />
                    <span className={`cc-status-dot ${prof.status === 'ONLINE' ? 'online' : 'offline'}`} />
                  </div>
                  <div className="cc-faculty-titles">
                    <div className="cc-name-row">
                      <h4>{prof.fullName}</h4>
                      {isMe && <span className="cc-you-pill">You</span>}
                    </div>
                    <span className="cc-dept-badge">{prof.department}</span>
                    <small className="cc-roll-text">ID: {prof.rollNumber || 'Faculty'}</small>
                  </div>
                </div>

                <p className="cc-faculty-bio">{prof.bio || 'Faculty member at College Connect.'}</p>

                <div className="cc-faculty-meta">
                  {prof.officeHours && (
                    <div className="cc-meta-row">
                      <Clock size={15} />
                      <span>{prof.officeHours}</span>
                    </div>
                  )}

                  {!prof.allowStudentDMs && (
                    <div className="cc-meta-row cc-dm-restricted">
                      <ShieldAlert size={15} />
                      <span>Student DMs restricted by policy</span>
                    </div>
                  )}
                </div>

                {!isMe && (
                  <div className="cc-faculty-card-actions">
                    <button
                      className={`cc-btn ${canMessage ? 'cc-btn-primary' : 'cc-btn-disabled'}`}
                      onClick={() => handleOpenChat(prof)}
                      disabled={startingChat}
                    >
                      <MessageSquare size={16} />
                      <span>
                        {currentUser.role === 'STUDENT'
                          ? canMessage
                            ? 'Ask Academic Query'
                            : 'DMs Restricted'
                          : 'Send Message'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Student Academic Query Modal */}
      {selectedFacultyForQuery && (
        <div className="cc-modal-backdrop" onClick={() => setSelectedFacultyForQuery(null)}>
          <div className="cc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cc-modal-header">
              <div className="cc-modal-title">
                <MessageSquare className="text-emerald-400" size={20} />
                <h3>Send Academic Query to {selectedFacultyForQuery.fullName}</h3>
              </div>
              <button className="cc-icon-btn" onClick={() => setSelectedFacultyForQuery(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSendStudentQuery} className="cc-modal-form">
              <div className="cc-faculty-card-preview">
                <img src={selectedFacultyForQuery.avatarUrl} alt="" className="cc-avatar-sm" />
                <div>
                  <strong>{selectedFacultyForQuery.fullName}</strong>
                  <p>{selectedFacultyForQuery.department}</p>
                </div>
              </div>

              <div className="cc-form-group">
                <label>Query Subject / Course</label>
                <input
                  type="text"
                  className="cc-input"
                  placeholder="e.g. Data Structures & Algorithms, AWS Lab, etc."
                  value={querySubject}
                  onChange={(e) => setQuerySubject(e.target.value)}
                  required
                />
              </div>

              <div className="cc-form-group">
                <label>Query Category</label>
                <select
                  className="cc-input"
                  value={queryCategory}
                  onChange={(e) => setQueryCategory(e.target.value)}
                >
                  <option value="Doubt Clarification">Doubt Clarification</option>
                  <option value="Assignment Help">Assignment Help</option>
                  <option value="Project Guidance">Project Guidance</option>
                  <option value="Exam / Test Query">Exam / Test Query</option>
                  <option value="Attendance / General">Attendance / General</option>
                </select>
              </div>

              <div className="cc-form-group">
                <label>Initial Message (optional)</label>
                <textarea
                  className="cc-input"
                  rows={3}
                  placeholder="Type your question or clarification request..."
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                />
              </div>

              <div className="cc-modal-actions">
                <button
                  type="button"
                  className="cc-btn cc-btn-secondary"
                  onClick={() => setSelectedFacultyForQuery(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cc-btn cc-btn-primary"
                  disabled={startingChat}
                >
                  {startingChat ? 'Connecting...' : 'Start Query Conversation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
