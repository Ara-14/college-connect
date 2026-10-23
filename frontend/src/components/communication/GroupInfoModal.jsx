import { useState, useEffect } from 'react'
import { X, Users, UserPlus, Shield, LogOut, Check, Search } from 'lucide-react'
import { api, getDefaultAvatar, getFullMediaUrl } from '../../services/api'

export default function GroupInfoModal({ conversation, currentUser, onClose, onUpdate }) {
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [candidateUsers, setCandidateUsers] = useState([])
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const members = conversation.members || []
  const existingMemberIds = members.map((m) => m.id)
  const myMembership = conversation.myMembership || {}
  const isAdmin = myMembership.role === 'ADMIN' || currentUser.role === 'FACULTY'

  useEffect(() => {
    if (showAddMembers) {
      const fetchCandidates = async () => {
        try {
          setLoadingCandidates(true)
          const params = conversation.isFacultyOnly ? { role: 'FACULTY' } : {}
          const data = await api.getUsers(params)
          setCandidateUsers(
            (data.users || []).filter((u) => !existingMemberIds.includes(u.id))
          )
        } catch (err) {
          console.error(err)
        } finally {
          setLoadingCandidates(false)
        }
      }
      fetchCandidates()
    }
  }, [showAddMembers, conversation.isFacultyOnly])

  const toggleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    )
  }

  const handleAddMembers = async () => {
    if (!selectedUserIds.length) return
    setSaving(true)
    setError('')
    try {
      await api.addGroupMembers(conversation.id, selectedUserIds)
      setShowAddMembers(false)
      setSelectedUserIds([])
      onUpdate?.()
    } catch (err) {
      setError(err.message || 'Failed to add members')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cc-modal-backdrop" onClick={onClose}>
      <div className="cc-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="cc-modal-header">
          <div className="cc-modal-title">
            <Users size={20} className="text-emerald-400" />
            <h3>Group Information</h3>
          </div>
          <button className="cc-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="cc-group-details-header">
          <div className="cc-group-icon-lg">
            {conversation.type === 'ANNOUNCEMENT' ? '📢' : '👥'}
          </div>
          <h4>{conversation.title || 'Conversation'}</h4>
          <p>{conversation.description || 'No description provided.'}</p>
          <div className="cc-group-meta-chips">
            <span className="cc-meta-chip">{conversation.type}</span>
            {conversation.department && <span className="cc-meta-chip">{conversation.department}</span>}
            {conversation.isFacultyOnly && <span className="cc-meta-chip cc-faculty-chip">Faculty Only</span>}
            {conversation.isReadOnly && <span className="cc-meta-chip cc-readonly-chip">Broadcast Only</span>}
          </div>
        </div>

        <div className="cc-group-section">
          <div className="cc-flex-between cc-mb-2">
            <h5>Members ({members.length})</h5>
            {isAdmin && !showAddMembers && (
              <button
                type="button"
                className="cc-text-btn"
                onClick={() => setShowAddMembers(true)}
              >
                <UserPlus size={16} />
                <span>Add Members</span>
              </button>
            )}
          </div>

          {showAddMembers && (
            <div className="cc-add-members-box">
              <h6>Select people to add:</h6>
              {loadingCandidates ? (
                <p className="cc-empty-state-sm">Loading users...</p>
              ) : candidateUsers.length === 0 ? (
                <p className="cc-empty-state-sm">No new users available to add.</p>
              ) : (
                <div className="cc-member-selector-box cc-member-selector-short">
                  {candidateUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id)
                    return (
                      <div
                        key={u.id}
                        className={`cc-member-select-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSelectUser(u.id)}
                      >
                        <img
                          src={getFullMediaUrl(u.avatarUrl) || getDefaultAvatar(u.fullName, u.role)}
                          alt={`${u.fullName}'s profile`}
                          className="cc-avatar-sm"
                        />
                        <div className="cc-member-info">
                          <strong>{u.fullName}</strong>
                          <span className={`cc-role-badge ${u.role === 'FACULTY' ? 'badge-faculty' : 'badge-student'}`}>
                            {u.role === 'FACULTY' ? 'Faculty' : 'Student'}
                          </span>
                        </div>
                        <div className={`cc-checkbox ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {error && <div className="cc-error-box">{error}</div>}
              <div className="cc-flex-end cc-mt-2 cc-gap-2">
                <button
                  type="button"
                  className="cc-btn cc-btn-secondary cc-btn-sm"
                  onClick={() => setShowAddMembers(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cc-btn cc-btn-primary cc-btn-sm"
                  disabled={selectedUserIds.length === 0 || saving}
                  onClick={handleAddMembers}
                >
                  {saving ? 'Adding...' : `Add Selected (${selectedUserIds.length})`}
                </button>
              </div>
            </div>
          )}

          <div className="cc-members-scroll">
            {members.map((m) => (
              <div key={m.id} className="cc-member-row">
                <img
                  src={getFullMediaUrl(m.avatarUrl) || getDefaultAvatar(m.fullName, m.role)}
                  alt={`${m.fullName}'s profile`}
                  className="cc-avatar-sm"
                />
                <div className="cc-member-details">
                  <div className="cc-member-name-row">
                    <strong>{m.fullName}</strong>
                    {m.id === currentUser.id && <span className="cc-you-pill">You</span>}
                    <span className={`cc-role-badge ${m.role === 'FACULTY' ? 'badge-faculty' : 'badge-student'}`}>
                      {m.role === 'FACULTY' ? 'Faculty' : 'Student'}
                    </span>
                  </div>
                  <small>{m.department} {m.semester ? `• ${m.semester}` : ''}</small>
                </div>
                {m.memberRole === 'ADMIN' && (
                  <span className="cc-admin-badge" title="Group Administrator">
                    <Shield size={13} />
                    <span>Admin</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="cc-modal-actions">
          <button type="button" className="cc-btn cc-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
