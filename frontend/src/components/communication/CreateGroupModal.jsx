import { useState, useEffect } from 'react'
import { X, Users, ShieldAlert, Sparkles, Check, Search, Lock } from 'lucide-react'
import { api, getDefaultAvatar, getFullMediaUrl } from '../../services/api'

export default function CreateGroupModal({ currentUser, onClose, onGroupCreated }) {
  const isFaculty = currentUser.role === 'FACULTY' || currentUser.role === 'ADMIN'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [groupType, setGroupType] = useState('STUDY') // STUDY, CLASS, FACULTY, ANNOUNCEMENT
  const [department, setDepartment] = useState(currentUser.department || 'Computer Science & Engineering')
  const [semester, setSemester] = useState(currentUser.semester || '5th Sem')
  const [section, setSection] = useState(currentUser.section || 'Section A')
  const [searchMember, setSearchMember] = useState('')
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isFacultyOnly = groupType === 'FACULTY'
  const isAnnouncement = groupType === 'ANNOUNCEMENT'

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true)
        // If faculty-only group, fetch only faculty
        const params = isFacultyOnly ? { role: 'FACULTY' } : {}
        const data = await api.getUsers(params)
        // Exclude current user from candidate list
        setAvailableUsers((data.users || []).filter((u) => u.id !== currentUser.id))
      } catch (err) {
        console.error('Failed to load users:', err)
      } finally {
        setLoadingUsers(false)
      }
    }
    fetchUsers()
  }, [isFacultyOnly, currentUser.id])

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please provide a group title.')
      return
    }

    if (isFacultyOnly && !isFaculty) {
      setError('Only faculty members are permitted to create faculty-only groups.')
      return
    }

    if (isAnnouncement && !isFaculty) {
      setError('Only faculty members are permitted to create official announcement channels.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        type: isAnnouncement ? 'ANNOUNCEMENT' : 'GROUP',
        isFacultyOnly,
        isReadOnly: isAnnouncement,
        department,
        semester,
        section,
        memberIds: selectedUserIds,
      }

      const res = await api.createGroup(payload)
      onGroupCreated(res.conversation)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create group.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredUsers = availableUsers.filter((u) =>
    searchMember
      ? u.fullName.toLowerCase().includes(searchMember.toLowerCase()) ||
        u.department?.toLowerCase().includes(searchMember.toLowerCase()) ||
        u.role.toLowerCase().includes(searchMember.toLowerCase())
      : true
  )

  return (
    <div className="cc-modal-backdrop" onClick={onClose}>
      <div className="cc-modal-card cc-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="cc-modal-header">
          <div className="cc-modal-title">
            <Users size={22} className="text-emerald-400" />
            <h3>Create New Group or Channel</h3>
          </div>
          <button className="cc-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="cc-modal-form">
          <div className="cc-form-group">
            <label>Group or Channel Type</label>
            <div className="cc-type-selector">
              <button
                type="button"
                className={`cc-type-chip ${groupType === 'STUDY' ? 'active' : ''}`}
                onClick={() => setGroupType('STUDY')}
              >
                <Sparkles size={16} />
                <span>Study Group</span>
              </button>

              <button
                type="button"
                className={`cc-type-chip ${groupType === 'CLASS' ? 'active' : ''}`}
                onClick={() => setGroupType('CLASS')}
              >
                <Users size={16} />
                <span>Class / Section</span>
              </button>

              <button
                type="button"
                className={`cc-type-chip ${groupType === 'FACULTY' ? 'active' : ''} ${!isFaculty ? 'disabled' : ''}`}
                onClick={() => isFaculty && setGroupType('FACULTY')}
                title={!isFaculty ? 'Faculty role required' : ''}
              >
                <Lock size={16} />
                <span>Faculty Committee</span>
                {!isFaculty && <small>(Faculty only)</small>}
              </button>

              <button
                type="button"
                className={`cc-type-chip ${groupType === 'ANNOUNCEMENT' ? 'active' : ''} ${!isFaculty ? 'disabled' : ''}`}
                onClick={() => isFaculty && setGroupType('ANNOUNCEMENT')}
                title={!isFaculty ? 'Faculty role required' : ''}
              >
                <ShieldAlert size={16} />
                <span>Announcement Channel</span>
                {!isFaculty && <small>(Faculty only)</small>}
              </button>
            </div>
          </div>

          <div className="cc-form-row">
            <div className="cc-form-group cc-flex-1">
              <label>Title *</label>
              <input
                type="text"
                className="cc-input"
                placeholder={
                  groupType === 'STUDY'
                    ? 'e.g. Algo Masters - 5th Sem'
                    : groupType === 'FACULTY'
                    ? 'e.g. CSE Faculty Examination Board'
                    : groupType === 'ANNOUNCEMENT'
                    ? 'e.g. 5th Sem Official Announcements'
                    : 'e.g. CSE Section A Project Discussion'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="cc-form-group cc-flex-1">
              <label>Department</label>
              <select
                className="cc-input"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Information Science">Information Science</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
              </select>
            </div>
          </div>

          <div className="cc-form-group">
            <label>Description (optional)</label>
            <textarea
              className="cc-input"
              rows={2}
              placeholder="State the objective of this group or channel..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Member Selection */}
          <div className="cc-form-group">
            <div className="cc-flex-between">
              <label>Add Initial Members ({selectedUserIds.length} selected)</label>
              <div className="cc-member-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Filter users..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                />
              </div>
            </div>

            <div className="cc-member-selector-box">
              {loadingUsers ? (
                <div className="cc-empty-state-sm">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="cc-empty-state-sm">No users found.</div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id)
                  return (
                    <div
                      key={u.id}
                      className={`cc-member-select-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleUser(u.id)}
                    >
                      <img
                        src={getFullMediaUrl(u.avatarUrl) || getDefaultAvatar(u.fullName, u.role)}
                        alt={`${u.fullName}'s profile`}
                        className="cc-avatar-sm"
                      />
                      <div className="cc-member-info">
                        <div className="cc-member-name-row">
                          <strong>{u.fullName}</strong>
                          <span className={`cc-role-badge ${u.role === 'FACULTY' ? 'badge-faculty' : 'badge-student'}`}>
                            {u.role === 'FACULTY' ? 'Faculty' : 'Student'}
                          </span>
                        </div>
                        <small>{u.department} {u.semester ? `• ${u.semester}` : ''}</small>
                      </div>
                      <div className={`cc-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {error && <div className="cc-error-box">{error}</div>}

          <div className="cc-modal-actions">
            <button type="button" className="cc-btn cc-btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="cc-btn cc-btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
