import { useState } from 'react'
import { Shield, Bell, Clock, User, Check, AlertCircle } from 'lucide-react'
import { api } from '../../services/api'

export default function CommunicationSettings({ currentUser, onProfileUpdated }) {
  const isFaculty = currentUser.role === 'FACULTY' || currentUser.role === 'ADMIN'

  const [allowStudentDMs, setAllowStudentDMs] = useState(currentUser.allowStudentDMs ?? true)
  const [officeHours, setOfficeHours] = useState(currentUser.officeHours || '')
  const [bio, setBio] = useState(currentUser.bio || '')
  const [status, setStatus] = useState(currentUser.status || 'ONLINE')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await api.updateProfile({
        allowStudentDMs,
        officeHours: isFaculty ? officeHours : undefined,
        bio,
        status,
      })

      // Update in localStorage
      localStorage.setItem('cc_auth_user', JSON.stringify(res.user))
      onProfileUpdated?.(res.user)
      setSuccess('Communication preferences saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cc-directory-page">
      <div className="cc-directory-header">
        <div>
          <h2>Communication Preferences & Policy ⚙️</h2>
          <p>Manage your direct messaging availability, status, and office hours.</p>
        </div>
      </div>

      <div className="cc-settings-container">
        <form onSubmit={handleSave} className="cc-settings-card">
          {success && (
            <div className="cc-alert-banner cc-alert-success">
              <Check size={18} />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="cc-alert-banner cc-alert-danger">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Online Presence Status */}
          <div className="cc-settings-section">
            <h4>
              <User size={18} />
              <span>Activity & Presence Status</span>
            </h4>
            <p className="cc-section-desc">Choose how your availability is displayed to students and colleagues.</p>

            <div className="cc-status-picker">
              <label className={`cc-status-option ${status === 'ONLINE' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="status"
                  value="ONLINE"
                  checked={status === 'ONLINE'}
                  onChange={() => setStatus('ONLINE')}
                />
                <span className="cc-status-dot online" />
                <div>
                  <strong>Online & Available</strong>
                  <small>Active and receiving messages</small>
                </div>
              </label>

              <label className={`cc-status-option ${status === 'AWAY' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="status"
                  value="AWAY"
                  checked={status === 'AWAY'}
                  onChange={() => setStatus('AWAY')}
                />
                <span className="cc-status-dot away" />
                <div>
                  <strong>In Lecture / Away</strong>
                  <small>In class, lab, or off-campus</small>
                </div>
              </label>
            </div>
          </div>

          {/* Faculty Direct Messaging Restriction Setting */}
          {isFaculty && (
            <div className="cc-settings-section">
              <h4>
                <Shield size={18} />
                <span>Student Direct Messaging Policy</span>
              </h4>
              <p className="cc-section-desc">
                In compliance with college guidelines, faculty members may restrict incoming student direct messages and mandate class announcement channels for academic questions.
              </p>

              <div className="cc-toggle-box">
                <div className="cc-toggle-info">
                  <strong>Allow Direct Messages from Students</strong>
                  <p>
                    When disabled, students cannot send new private DMs or queries to you and will be advised to use class announcement discussions or attend your scheduled office hours.
                  </p>
                </div>
                <label className="cc-switch">
                  <input
                    type="checkbox"
                    checked={allowStudentDMs}
                    onChange={(e) => setAllowStudentDMs(e.target.checked)}
                  />
                  <span className="cc-slider round" />
                </label>
              </div>

              <div className="cc-form-group cc-mt-3">
                <label>Office Hours & Location</label>
                <input
                  type="text"
                  className="cc-input"
                  placeholder="e.g. Mon-Thu 2:00 PM - 4:00 PM (Room 302 / Lab 4)"
                  value={officeHours}
                  onChange={(e) => setOfficeHours(e.target.value)}
                />
                <small className="cc-text-muted">Students will see this on your faculty directory profile.</small>
              </div>
            </div>
          )}

          {/* Academic Bio */}
          <div className="cc-settings-section">
            <h4>
              <Clock size={18} />
              <span>Bio & Department Note</span>
            </h4>
            <div className="cc-form-group">
              <textarea
                className="cc-input"
                rows={3}
                placeholder="Share your academic specialization, research areas, or guidelines..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>

          <div className="cc-flex-end">
            <button type="submit" className="cc-btn cc-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
