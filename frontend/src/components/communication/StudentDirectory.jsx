import { useState, useEffect } from 'react'
import { Search, MessageSquare, BookOpen, User, Sparkles } from 'lucide-react'
import { api } from '../../services/api'

export default function StudentDirectory({ currentUser, onStartConversation }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [semesterFilter, setSemesterFilter] = useState('All')
  const [startingChatId, setStartingChatId] = useState(null)
  const [errorNotice, setErrorNotice] = useState('')

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true)
        const data = await api.getUsers({ role: 'STUDENT' })
        setStudents(data.users || [])
      } catch (err) {
        console.error('Error fetching students:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStudents()
  }, [])

  const departments = ['All', 'Computer Science & Engineering', 'Information Science', 'Electronics & Communication']
  const semesters = ['All', '1st Sem', '2nd Sem', '3rd Sem', '4th Sem', '5th Sem', '6th Sem', '7th Sem', '8th Sem']

  const filteredStudents = students.filter((s) => {
    const matchSearch =
      search === '' ||
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase())

    const matchDept = deptFilter === 'All' || s.department === deptFilter
    const matchSem = semesterFilter === 'All' || s.semester === semesterFilter

    return matchSearch && matchDept && matchSem
  })

  const handleStartChat = async (student) => {
    if (student.id === currentUser.id) return
    setStartingChatId(student.id)
    setErrorNotice('')

    try {
      const res = await api.getDirectConversation(student.id)
      onStartConversation(res.conversation)
    } catch (err) {
      setErrorNotice(err.message || 'Failed to start conversation.')
    } finally {
      setStartingChatId(null)
    }
  }

  return (
    <div className="cc-directory-page">
      <div className="cc-directory-header">
        <div>
          <h2>Student Directory 📚</h2>
          <p>Discover classmates, find project teammates, and collaborate with peers.</p>
        </div>

        <div className="cc-directory-controls">
          <div className="cc-search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by student name, USN, or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="cc-dept-select"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All Branches' : d}
              </option>
            ))}
          </select>

          <select
            className="cc-dept-select"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
          >
            {semesters.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Semesters' : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorNotice && (
        <div className="cc-alert-banner cc-alert-warning">
          <span>{errorNotice}</span>
          <button className="cc-banner-close" onClick={() => setErrorNotice('')}>
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="cc-loading-center">
          <div className="cc-spinner" />
          <p>Loading student directory...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="cc-empty-state">
          <Sparkles size={36} />
          <h3>No students match your criteria</h3>
          <p>Try clearing filters or search by a different name.</p>
        </div>
      ) : (
        <div className="cc-student-grid">
          {filteredStudents.map((s) => {
            const isMe = s.id === currentUser.id
            const isOnline = s.status === 'ONLINE'

            return (
              <div key={s.id} className="cc-student-card">
                <div className="cc-student-top">
                  <div className="cc-avatar-wrapper">
                    <img src={s.avatarUrl} alt="" className="cc-student-avatar" />
                    <span className={`cc-status-dot ${isOnline ? 'online' : 'offline'}`} />
                  </div>

                  <div className="cc-student-info">
                    <div className="cc-name-row">
                      <h4>{s.fullName}</h4>
                      {isMe && <span className="cc-you-pill">You</span>}
                    </div>
                    <span className="cc-dept-badge">{s.department}</span>
                    <div className="cc-student-tags">
                      {s.semester && <span className="cc-mini-tag">{s.semester}</span>}
                      {s.section && <span className="cc-mini-tag">{s.section}</span>}
                      {s.rollNumber && <span className="cc-mini-tag cc-roll-tag">{s.rollNumber}</span>}
                    </div>
                  </div>
                </div>

                <p className="cc-student-bio">{s.bio || 'College student at VTU.'}</p>

                {!isMe && (
                  <button
                    className="cc-btn cc-btn-primary cc-btn-full"
                    onClick={() => handleStartChat(s)}
                    disabled={startingChatId === s.id}
                  >
                    <MessageSquare size={16} />
                    <span>{startingChatId === s.id ? 'Connecting...' : 'Message Student'}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
