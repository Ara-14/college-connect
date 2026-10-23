import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Hash, MapPin, Send } from 'lucide-react'
import ChatWindow from './communication/ChatWindow'
import { api } from '../services/api'
import { getSocket } from '../services/socket'

export default function CommunityChannels({
  currentUser,
  selectedChannel,
  onSelectChannel,
  onAskPersonalAI,
}) {
  const [channels, setChannels] = useState([])
  const [events, setEvents] = useState([])
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [error, setError] = useState('')
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [eventSubmitting, setEventSubmitting] = useState(false)
  const [eventError, setEventError] = useState('')
  const [eventForm, setEventForm] = useState({
    title: '',
    startsAt: '',
    location: '',
    description: '',
  })

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.name === selectedChannel) || channels[0],
    [channels, selectedChannel]
  )
  const activeChannelId = activeChannel?.id

  useEffect(() => {
    let active = true
    api.getCommunityChannels()
      .then(({ channels: results }) => {
        if (active) setChannels(results || [])
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message || 'Community channels could not be loaded.')
      })
      .finally(() => {
        if (active) setLoadingChannels(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!activeChannelId) return undefined
    let active = true
    Promise.resolve()
      .then(() => {
        if (!active) return null
        setLoadingEvents(true)
        setEventError('')
        return api.getCommunityEvents(activeChannelId)
      })
      .then((data) => {
        if (active && data) setEvents(data.events || [])
      })
      .catch((fetchError) => {
        if (active) setEventError(fetchError.message || 'Events could not be loaded.')
      })
      .finally(() => {
        if (active) setLoadingEvents(false)
      })
    return () => {
      active = false
    }
  }, [activeChannelId])

  useEffect(() => {
    const socket = getSocket()
    const handleNewMessage = (message) => {
      window.dispatchEvent(new CustomEvent('cc_socket_new_message', { detail: message }))
    }
    socket.on('new_message', handleNewMessage)
    return () => socket.off('new_message', handleNewMessage)
  }, [])

  const submitEvent = async (event) => {
    event.preventDefault()
    if (!activeChannel || eventSubmitting) return
    setEventSubmitting(true)
    setEventError('')
    try {
      const { event: createdEvent } = await api.createCommunityEvent({
        ...eventForm,
        channelId: activeChannel.id,
      })
      setEvents((current) => [...current, createdEvent]
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)))
      setEventForm({ title: '', startsAt: '', location: '', description: '' })
      setEventFormOpen(false)
    } catch (submitError) {
      setEventError(submitError.message || 'The event could not be published.')
    } finally {
      setEventSubmitting(false)
    }
  }

  if (loadingChannels) {
    return <div className="cc-loading-center"><div className="cc-spinner" /><p>Loading community channels...</p></div>
  }

  if (error) {
    return <div className="community-hub-error" role="alert">{error}</div>
  }

  return (
    <section className="community-hub">
      <header className="community-hub-header">
        <div>
          <h2>Campus Communities</h2>
          <p>Join the conversation, share photos and voice notes, or post a campus event.</p>
        </div>
      </header>

      <nav className="community-channel-tabs" aria-label="Community channels">
        {channels.map((channel) => (
          <button
            type="button"
            key={channel.id}
            className={`community-channel-tab ${activeChannel?.id === channel.id ? 'active' : ''}`}
            onClick={() => onSelectChannel(channel.name)}
          >
            <Hash size={16} />
            {channel.name}
          </button>
        ))}
      </nav>

      {activeChannel && (
        <>
          <section className="community-events-panel" aria-labelledby="community-events-title">
            <div className="community-events-heading">
              <div>
                <h3 id="community-events-title"><CalendarDays size={18} /> Events in #{activeChannel.name}</h3>
                <p>Events are visible to everyone in the community.</p>
              </div>
              <button
                type="button"
                className="cc-btn cc-btn-secondary cc-btn-xs"
                onClick={() => {
                  setEventError('')
                  setEventFormOpen((open) => !open)
                }}
              >
                {eventFormOpen ? 'Cancel' : 'Create event'}
              </button>
            </div>

            {eventFormOpen && (
              <form className="community-event-form" onSubmit={submitEvent}>
                <label>
                  Event name
                  <input
                    required
                    maxLength={120}
                    value={eventForm.title}
                    onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })}
                  />
                </label>
                <label>
                  Date and time
                  <input
                    required
                    type="datetime-local"
                    value={eventForm.startsAt}
                    onChange={(event) => setEventForm({ ...eventForm, startsAt: event.target.value })}
                  />
                </label>
                <label>
                  Location
                  <input
                    maxLength={200}
                    value={eventForm.location}
                    onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })}
                  />
                </label>
                <label>
                  Details
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={eventForm.description}
                    onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })}
                  />
                </label>
                <button type="submit" className="cc-btn cc-btn-primary cc-btn-xs" disabled={eventSubmitting}>
                  <Send size={14} /> {eventSubmitting ? 'Publishing...' : 'Publish event'}
                </button>
              </form>
            )}

            {eventError && <p className="community-event-error" role="alert">{eventError}</p>}
            {loadingEvents ? (
              <p className="community-events-empty">Loading events...</p>
            ) : events.length ? (
              <div className="community-events-list">
                {events.map((event) => (
                  <article className="community-event-card" key={event.id}>
                    <div>
                      <strong>{event.title}</strong>
                      {event.description && <p>{event.description}</p>}
                      <small>
                        <CalendarDays size={13} />
                        {new Date(event.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        {event.location && <><span>·</span><MapPin size={13} />{event.location}</>}
                      </small>
                      <small>Posted by {event.creator?.fullName || 'Community member'}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="community-events-empty">No events yet in this channel. Create the first one.</p>
            )}
          </section>

          <section className="community-chat-panel" aria-label={`Chat in ${activeChannel.name}`}>
            <div className="community-chat-heading">
              <Hash size={18} />
              <div>
                <strong>{activeChannel.name}</strong>
                <small>Everyone signed in can participate.</small>
              </div>
            </div>
            <ChatWindow
              key={activeChannel.conversation.id}
              conversation={activeChannel.conversation}
              currentUser={currentUser}
              onAskPersonalAI={onAskPersonalAI}
            />
          </section>
        </>
      )}
    </section>
  )
}
