import { useCallback, useEffect, useState } from 'react'
import { MessageCircleMore, X } from 'lucide-react'
import { api } from '../../services/api'

export default function FreeToTalkAppeals({ onClose }) {
  const [actions, setActions] = useState([])
  const [reasons, setReasons] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')

  const loadActions = useCallback(async () => {
    try {
      const data = await api.getMyFreeToTalkActions()
      setActions(data.actions || [])
      setError('')
    } catch (err) {
      setError(err.message || 'Could not load your moderation history.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadActions()
  }, [loadActions])

  const submitAppeal = async (actionId) => {
    setSavingId(actionId)
    setError('')
    try {
      await api.appealFreeToTalkAction(actionId, reasons[actionId] || '')
      await loadActions()
    } catch (err) {
      setError(err.message || 'Could not submit your appeal.')
    } finally {
      setSavingId('')
    }
  }

  return (
    <div className="cc-modal-backdrop cc-ftt-modal-backdrop" onClick={onClose}>
      <section
        className="cc-modal-card cc-ftt-moderation-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-ftt-appeals-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cc-modal-header">
          <div className="cc-modal-title">
            <MessageCircleMore size={20} />
            <h3 id="cc-ftt-appeals-title">Your moderation actions</h3>
          </div>
          <button type="button" className="cc-icon-btn" aria-label="Close appeals" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="cc-modal-desc">Appeals are private and reviewed by authorized moderators.</p>
        {error && <div className="cc-error-box" role="alert">{error}</div>}
        {loading ? (
          <div className="cc-loading-center"><div className="cc-spinner" /><p>Loading your history...</p></div>
        ) : actions.length === 0 ? (
          <p className="cc-empty-state-sm">There are no moderation actions on your account.</p>
        ) : actions.map((action) => {
          const appeal = action.appeals[0]
          const restricted = action.action === 'SUSPEND' && action.restrictionUntil
          return (
            <article className="cc-ftt-review-card" key={action.id}>
              <strong>{action.action.replaceAll('_', ' ')}</strong>
              {restricted && (
                <p className="cc-ftt-priority">
                  Messaging was restricted until {new Date(action.restrictionUntil).toLocaleString()}.
                </p>
              )}
              <p>{action.reason}</p>
              {appeal ? (
                <div className="cc-ftt-appeal-status">
                  <strong>Appeal: {appeal.status.toLowerCase()}</strong>
                  {appeal.response && <p>{appeal.response}</p>}
                </div>
              ) : (
                <>
                  <label>
                    Appeal this decision privately
                    <textarea
                      className="cc-input"
                      rows={3}
                      value={reasons[action.id] || ''}
                      onChange={(event) => setReasons((previous) => ({
                        ...previous,
                        [action.id]: event.target.value,
                      }))}
                      placeholder="Explain why you believe this action should be reviewed."
                    />
                  </label>
                  <button
                    type="button"
                    className="cc-btn cc-btn-secondary cc-btn-sm"
                    disabled={savingId === action.id}
                    onClick={() => submitAppeal(action.id)}
                  >
                    {savingId === action.id ? 'Submitting...' : 'Submit appeal'}
                  </button>
                </>
              )}
            </article>
          )
        })}
      </section>
    </div>
  )
}
