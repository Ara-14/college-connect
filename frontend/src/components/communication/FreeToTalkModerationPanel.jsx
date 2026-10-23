import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Shield, X } from 'lucide-react'
import { api } from '../../services/api'

export default function FreeToTalkModerationPanel({ conversation, currentUser, onClose }) {
  const [reports, setReports] = useState([])
  const [appeals, setAppeals] = useState([])
  const [forms, setForms] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState('')
  const [settingsReason, setSettingsReason] = useState('')
  const [moderatorUserId, setModeratorUserId] = useState('')
  const [moderatorRole, setModeratorRole] = useState('MODERATOR')
  const [moderatorReason, setModeratorReason] = useState('')
  const [settings, setSettings] = useState({ messageRateLimitSeconds: 5, reportReviewHours: 48 })
  const isSystemAdmin = currentUser.role === 'ADMIN'

  const loadQueue = useCallback(async () => {
    try {
      const [reportData, appealData, settingsData] = await Promise.all([
        api.getFreeToTalkReports(conversation.id),
        api.getFreeToTalkAppeals(conversation.id),
        isSystemAdmin ? api.getFreeToTalkSettings(conversation.id) : Promise.resolve(null),
      ])
      setReports(reportData.reports || [])
      setAppeals(appealData.appeals || [])
      if (settingsData) {
        setSettings({
          messageRateLimitSeconds: settingsData.messageRateLimitSeconds,
          reportReviewHours: settingsData.reportReviewHours,
        })
      }
      setError('')
    } catch (err) {
      setError(err.message || 'Could not load moderation queue.')
    } finally {
      setLoading(false)
    }
  }, [conversation.id, isSystemAdmin])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const updateForm = (id, values) => {
    setForms((previous) => ({
      ...previous,
      [id]: { action: 'DISMISS', reason: '', durationMinutes: 60, ...previous[id], ...values },
    }))
  }

  const submitAction = async (report) => {
    const form = forms[report.id] || { action: 'DISMISS', reason: '', durationMinutes: 60 }
    setSavingId(report.id)
    setError('')
    try {
      await api.moderateFreeToTalkReport(report.id, form)
      await loadQueue()
    } catch (err) {
      setError(err.message || 'Could not record the moderation action.')
    } finally {
      setSavingId('')
    }
  }

  const submitAppealDecision = async (appeal, decision) => {
    const response = forms[appeal.id]?.response || ''
    setSavingId(appeal.id)
    setError('')
    try {
      await api.reviewFreeToTalkAppeal(appeal.id, decision, response)
      await loadQueue()
    } catch (err) {
      setError(err.message || 'Could not review the appeal.')
    } finally {
      setSavingId('')
    }
  }

  const saveSettings = async () => {
    setError('')
    try {
      await api.updateFreeToTalkSettings(conversation.id, {
        messageRateLimitSeconds: Number(settings.messageRateLimitSeconds),
        reportReviewHours: Number(settings.reportReviewHours),
        reason: settingsReason,
      })
      setSettingsReason('')
    } catch (err) {
      setError(err.message || 'Could not save safety settings.')
    }
  }

  const saveModerator = async () => {
    setError('')
    try {
      await api.updateFreeToTalkModerator(
        conversation.id,
        moderatorUserId.trim(),
        moderatorRole,
        moderatorReason
      )
      setModeratorUserId('')
      setModeratorReason('')
    } catch (err) {
      setError(err.message || 'Could not update moderator access.')
    }
  }

  return (
    <div className="cc-modal-backdrop cc-ftt-modal-backdrop" onClick={onClose}>
      <section
        className="cc-modal-card cc-ftt-moderation-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-ftt-moderation-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cc-modal-header">
          <div className="cc-modal-title">
            <Shield size={20} />
            <h3 id="cc-ftt-moderation-title">Free to Talk moderation</h3>
          </div>
          <button type="button" className="cc-icon-btn" aria-label="Close moderation panel" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="cc-modal-desc">
          Reports are anonymous to moderators. Message authors remain hidden in this queue. Handle urgent safety reports first.
        </p>
        {error && <div className="cc-error-box" role="alert">{error}</div>}

        {loading ? (
          <div className="cc-loading-center"><div className="cc-spinner" /><p>Loading review queue...</p></div>
        ) : (
          <>
            <div className="cc-ftt-review-section">
              <h4>Reports ({reports.length})</h4>
              {reports.length === 0 ? (
                <p className="cc-empty-state-sm">No reports need review.</p>
              ) : reports.map((report) => {
                const form = forms[report.id] || { action: 'DISMISS', reason: '', durationMinutes: 60 }
                return (
                  <article className="cc-ftt-review-card" key={report.id}>
                    {report.priority && (
                      <span className="cc-ftt-priority"><AlertTriangle size={13} /> Priority review</span>
                    )}
                    <strong>{report.category.replaceAll('_', ' ')}</strong>
                    <p className="cc-ftt-reported-content">{report.message.content}</p>
                    <p className="cc-ftt-report-reason">{report.reason}</p>
                    <label>
                      Action
                      <select
                        className="cc-input"
                        value={form.action}
                        onChange={(event) => updateForm(report.id, { action: event.target.value })}
                      >
                        <option value="DISMISS">Dismiss report</option>
                        <option value="HIDE">Hide message pending follow-up</option>
                        <option value="REMOVE">Remove message</option>
                        <option value="WARN">Issue a warning</option>
                        <option value="SUSPEND">Temporarily restrict messaging</option>
                      </select>
                    </label>
                    {form.action === 'SUSPEND' && (
                      <label>
                        Restriction duration (minutes, 5-10080)
                        <input
                          className="cc-input"
                          type="number"
                          min="5"
                          max="10080"
                          value={form.durationMinutes}
                          onChange={(event) => updateForm(report.id, { durationMinutes: Number(event.target.value) })}
                        />
                      </label>
                    )}
                    <label>
                      Reason for this decision
                      <textarea
                        className="cc-input"
                        rows={2}
                        value={form.reason}
                        onChange={(event) => updateForm(report.id, { reason: event.target.value })}
                        placeholder="Record the evidence and proportionality of this action."
                      />
                    </label>
                    <button
                      type="button"
                      className="cc-btn cc-btn-primary cc-btn-sm"
                      disabled={savingId === report.id}
                      onClick={() => submitAction(report)}
                    >
                      {savingId === report.id ? 'Recording...' : 'Record action'}
                    </button>
                  </article>
                )
              })}
            </div>

            <div className="cc-ftt-review-section">
              <h4>Appeals ({appeals.length})</h4>
              {appeals.length === 0 ? (
                <p className="cc-empty-state-sm">No appeals need review.</p>
              ) : appeals.map((appeal) => (
                <article className="cc-ftt-review-card" key={appeal.id}>
                  <strong>{appeal.action.action.replaceAll('_', ' ')}</strong>
                  <p>{appeal.reason}</p>
                  <label>
                    Private response to the member
                    <textarea
                      className="cc-input"
                      rows={2}
                      value={forms[appeal.id]?.response || ''}
                      onChange={(event) => updateForm(appeal.id, { response: event.target.value })}
                    />
                  </label>
                  <div className="cc-modal-actions">
                    <button
                      type="button"
                      className="cc-btn cc-btn-secondary cc-btn-sm"
                      disabled={savingId === appeal.id}
                      onClick={() => submitAppealDecision(appeal, 'DENIED')}
                    >
                      Deny
                    </button>
                    <button
                      type="button"
                      className="cc-btn cc-btn-primary cc-btn-sm"
                      disabled={savingId === appeal.id}
                      onClick={() => submitAppealDecision(appeal, 'GRANTED')}
                    >
                      Grant appeal
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {isSystemAdmin && (
              <div className="cc-ftt-review-section">
                <h4>Safety configuration</h4>
                <label>
                  Message rate limit (seconds)
                  <input
                    className="cc-input"
                    type="number"
                    min="1"
                    max="60"
                    value={settings.messageRateLimitSeconds}
                    onChange={(event) => setSettings((value) => ({
                      ...value,
                      messageRateLimitSeconds: event.target.value,
                    }))}
                  />
                </label>
                <label>
                  Report review target (hours)
                  <input
                    className="cc-input"
                    type="number"
                    min="1"
                    max="720"
                    value={settings.reportReviewHours}
                    onChange={(event) => setSettings((value) => ({
                      ...value,
                      reportReviewHours: event.target.value,
                    }))}
                  />
                </label>
                <label>
                  Reason for configuration change
                  <textarea
                    className="cc-input"
                    rows={2}
                    value={settingsReason}
                    onChange={(event) => setSettingsReason(event.target.value)}
                    placeholder="Explain why these safety settings are changing."
                  />
                </label>
                <button
                  type="button"
                  className="cc-btn cc-btn-primary cc-btn-sm"
                  disabled={settingsReason.trim().length < 5}
                  onClick={saveSettings}
                >
                  Save safety settings
                </button>
                <h4>Moderator access</h4>
                <label>
                  Member account ID
                  <input
                    className="cc-input"
                    value={moderatorUserId}
                    onChange={(event) => setModeratorUserId(event.target.value)}
                    placeholder="Paste the member's account ID"
                  />
                </label>
                <label>
                  Access
                  <select
                    className="cc-input"
                    value={moderatorRole}
                    onChange={(event) => setModeratorRole(event.target.value)}
                  >
                    <option value="MODERATOR">Assign moderator</option>
                    <option value="MEMBER">Remove moderator access</option>
                  </select>
                </label>
                <label>
                  Reason for access change
                  <textarea
                    className="cc-input"
                    rows={2}
                    value={moderatorReason}
                    onChange={(event) => setModeratorReason(event.target.value)}
                    placeholder="Record the authorization reason."
                  />
                </label>
                <button
                  type="button"
                  className="cc-btn cc-btn-secondary cc-btn-sm"
                  disabled={!moderatorUserId.trim() || moderatorReason.trim().length < 5}
                  onClick={saveModerator}
                >
                  Update moderator access
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
