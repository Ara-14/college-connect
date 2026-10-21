import { useState } from 'react'
import { AlertTriangle, X, Check } from 'lucide-react'
import { api } from '../../services/api'

export default function ReportModal({ message, onClose, onReportSuccess }) {
  const [reason, setReason] = useState('Inappropriate Content')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const reasons = [
    'Inappropriate Content',
    'Harassment or Bullying',
    'Spam or Commercial Promotion',
    'Academic Dishonesty / Cheating',
    'Hate Speech or Discrimination',
    'Other',
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const fullReason = details.trim() ? `${reason}: ${details.trim()}` : reason
      await api.reportMessage(message.id, fullReason)
      setSubmitted(true)
      setTimeout(() => {
        onReportSuccess?.()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cc-modal-backdrop" onClick={onClose}>
      <div className="cc-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="cc-modal-header">
          <div className="cc-modal-title">
            <AlertTriangle className="text-amber-400" size={20} />
            <h3>Report Message</h3>
          </div>
          <button className="cc-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="cc-modal-success">
            <div className="cc-success-badge">
              <Check size={28} />
            </div>
            <h4>Report Submitted</h4>
            <p>Thank you. This message has been flagged for departmental administration review.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="cc-modal-form">
            <p className="cc-modal-desc">
              Help keep our college community safe and respectful. Reports are confidential and reviewed by faculty administrators.
            </p>

            <div className="cc-reported-quote">
              <span className="cc-quote-author">{message.sender?.fullName || 'User'}:</span>
              <p>{message.content}</p>
            </div>

            <div className="cc-form-group">
              <label>Reason for report</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="cc-input">
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="cc-form-group">
              <label>Additional details (optional)</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide context for the moderation team..."
                rows={3}
                className="cc-input"
              />
            </div>

            {error && <div className="cc-error-box">{error}</div>}

            <div className="cc-modal-actions">
              <button type="button" className="cc-btn cc-btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="cc-btn cc-btn-danger" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
