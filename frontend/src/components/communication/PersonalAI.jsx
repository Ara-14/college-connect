import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, FileDown, Send, Sparkles } from 'lucide-react'
import { api } from '../../services/api'

export default function PersonalAI({ request, onRequestHandled }) {
  const [entries, setEntries] = useState([])
  const [prompt, setPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const endRef = useRef(null)
  const handledRequestId = useRef(null)

  const ask = useCallback(async (value) => {
    const question = value.trim()
    if (!question || submitting) return

    const id = `${Date.now()}-${Math.random()}`
    setEntries((previous) => [...previous, { id, question, loading: true }])
    setPrompt('')
    setSubmitting(true)

    try {
      const result = await api.askPersonalAI(question)
      setEntries((previous) => previous.map((entry) => entry.id === id
        ? { ...entry, answer: result.answer, sources: result.sources || [], loading: false }
        : entry))
    } catch (error) {
      setEntries((previous) => previous.map((entry) => entry.id === id
        ? { ...entry, error: error.message || 'Personal AI could not respond.', loading: false }
        : entry))
    } finally {
      setSubmitting(false)
    }
  }, [submitting])

  useEffect(() => {
    if (!request || handledRequestId.current === request.id) return
    handledRequestId.current = request.id
    onRequestHandled?.()
    ask(request.prompt)
  }, [request, ask, onRequestHandled])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries])

  const handleSubmit = (event) => {
    event.preventDefault()
    ask(prompt)
  }

  return (
    <section className="cc-personal-ai" aria-labelledby="cc-personal-ai-title">
      <header className="cc-personal-ai-header">
        <div className="cc-personal-ai-title">
          <span className="cc-personal-ai-icon"><Sparkles size={21} /></span>
          <div>
            <h2 id="cc-personal-ai-title">Personal AI</h2>
            <p>Ask for study help and find useful learning resources.</p>
          </div>
        </div>
        <span className="cc-personal-ai-badge">Private to you</span>
      </header>

      <div className="cc-personal-ai-thread" aria-live="polite">
        {entries.length === 0 ? (
          <div className="cc-personal-ai-empty">
            <Sparkles size={34} />
            <h3>Your personal study assistant</h3>
            <p>
              Ask for clear notes, explanations, or trustworthy study links.
              In a chat, type <code>@AI computer networks notes</code> to ask privately.
            </p>
          </div>
        ) : entries.map((entry) => (
          <article className="cc-personal-ai-entry" key={entry.id}>
            <div className="cc-personal-ai-question">
              <span>You</span>
              <p>{entry.question}</p>
            </div>
            <div className="cc-personal-ai-answer">
              <span><Sparkles size={14} /> Personal AI</span>
              {entry.loading ? (
                <p className="cc-personal-ai-status">Searching sources and preparing an answer…</p>
              ) : entry.error ? (
                <p className="cc-personal-ai-error" role="alert">{entry.error}</p>
              ) : (
                <>
                  <p className="cc-personal-ai-answer-text">{entry.answer}</p>
                  {entry.sources?.length > 0 && (
                    <div className="cc-personal-ai-sources">
                      <h4>Sources and study links</h4>
                      {entry.sources.map((source) => (
                        <a
                          href={source.url}
                          key={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cc-personal-ai-source"
                        >
                          {source.isPdf ? <FileDown size={16} /> : <ExternalLink size={15} />}
                          <span>{source.title}</span>
                          <small>{source.isPdf ? 'PDF' : 'Open link'}</small>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
        <div ref={endRef} />
      </div>

      <form className="cc-personal-ai-form" onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSubmit(event)
            }
          }}
          placeholder="Ask for notes, an explanation, or study resources…"
          aria-label="Ask Personal AI"
          maxLength={2000}
          rows={2}
          disabled={submitting}
        />
        <button type="submit" disabled={!prompt.trim() || submitting} aria-label="Ask Personal AI">
          <Send size={18} />
        </button>
      </form>
      <p className="cc-personal-ai-privacy">
        Only your question is sent to Google Gemini for an answer and web search. Chat history is never included; this AI session is not saved after you leave.
      </p>
    </section>
  )
}
