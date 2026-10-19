import { useEffect, useState } from 'react'
import {
  Home,
  Search,
  Compass,
  MessageCircle,
  Heart,
  PlusSquare,
  User,
  Settings,
  Bell,
  LogOut,
  Image as ImageIcon,
  Send,
  Bookmark,
  MoreHorizontal,
  Hash,
  Users,
  Menu,
  X,
  Camera,
  GraduationCap,
  Smile,
  ArrowLeft,
  Check,
} from 'lucide-react'

import './App.css'

const initialPosts = [
  {
    id: 1,
    user: 'Aarav Sharma',
    username: 'aarav_sharma',
    avatar: 'https://i.pravatar.cc/150?img=12',
    location: 'Computer Science Department',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1000',
    caption: 'Another beautiful day on campus! 🎓✨',
    likes: 248,
    liked: false,
    saved: false,
    time: '2 hours ago',
    comments: [
      { user: 'priya', text: 'Amazing picture! ❤️' },
      { user: 'rahul', text: 'Our campus looks beautiful!' },
    ],
  },
  {
    id: 2,
    user: 'Priya Reddy',
    username: 'priya_reddy',
    avatar: 'https://i.pravatar.cc/150?img=47',
    location: 'College Cultural Fest',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1000',
    caption: 'College fest memories! Best night ever! 💜🎉 #CollegeLife',
    likes: 532,
    liked: false,
    saved: false,
    time: '5 hours ago',
    comments: [
      { user: 'aarav', text: 'What an incredible event!' },
    ],
  },
  {
    id: 3,
    user: 'Rahul Kumar',
    username: 'rahul_codes',
    avatar: 'https://i.pravatar.cc/150?img=15',
    location: 'Coding Club',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000',
    caption: 'Late-night coding sessions hit different! 💻🔥',
    likes: 189,
    liked: false,
    saved: false,
    time: 'Yesterday',
    comments: [],
  },
]

const students = [
  {
    id: 1,
    name: 'Aarav Sharma',
    username: 'aarav_sharma',
    avatar: 'https://i.pravatar.cc/150?img=12',
    online: true,
  },
  {
    id: 2,
    name: 'Priya Reddy',
    username: 'priya_reddy',
    avatar: 'https://i.pravatar.cc/150?img=47',
    online: true,
  },
  {
    id: 3,
    name: 'Rahul Kumar',
    username: 'rahul_codes',
    avatar: 'https://i.pravatar.cc/150?img=15',
    online: false,
  },
  {
    id: 4,
    name: 'Sneha Patel',
    username: 'sneha_art',
    avatar: 'https://i.pravatar.cc/150?img=44',
    online: true,
  },
]

const communities = [
  { id: 1, name: 'general', icon: Hash },
  { id: 2, name: 'announcements', icon: Bell },
  { id: 3, name: 'coding-club', icon: Hash },
  { id: 4, name: 'campus-events', icon: Hash },
  { id: 5, name: 'memes', icon: Smile },
]

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [college, setCollege] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [activePage, setActivePage] = useState('home')
  const [posts, setPosts] = useState(initialPosts)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [newCaption, setNewCaption] = useState('')
  const [newImage, setNewImage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [commentInputs, setCommentInputs] = useState({})
  const [following, setFollowing] = useState([])
  const [activeChat, setActiveChat] = useState(students[0])
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState({})
  const [activeChannel, setActiveChannel] = useState('general')
  const [notifications, setNotifications] = useState([
    'Priya liked your latest post ❤️',
    'Aarav started following you 👋',
    'Coding Club has a new announcement 💻',
  ])

  const displayName = fullName.trim() || 'College Student'

  const myAvatar =
    'https://api.dicebear.com/9.x/initials/svg?seed=' +
    encodeURIComponent(displayName)

  const navigation = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'communities', label: 'Communities', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const navigate = (page) => {
    setActivePage(page)
    setMobileMenuOpen(false)
  }

  const handleAuth = (e) => {
    e.preventDefault()

    if (isRegistering) {
      if (password !== confirmPassword) {
        alert('Passwords do not match!')
        return
      }

      if (password.length < 8) {
        alert('Password must be at least 8 characters!')
        return
      }
    }

    // Demo authentication only.
    setIsLoggedIn(true)
    setActivePage('home')
  }

  const toggleLike = (id) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? {
              ...post,
              liked: !post.liked,
              likes: post.likes + (post.liked ? -1 : 1),
            }
          : post
      )
    )
  }

  const toggleSave = (id) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? { ...post, saved: !post.saved }
          : post
      )
    )
  }

  const addComment = (id) => {
    const text = (commentInputs[id] || '').trim()
    if (!text) return

    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? {
              ...post,
              comments: [
                ...post.comments,
                { user: displayName, text },
              ],
            }
          : post
      )
    )

    setCommentInputs((current) => ({ ...current, [id]: '' }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Please choose an image smaller than 5 MB.')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setNewImage(String(reader.result))
    }

    reader.readAsDataURL(file)
  }

  const createPost = (e) => {
    e.preventDefault()

    if (!newCaption.trim() && !newImage) {
      alert('Add a caption or an image!')
      return
    }

    const post = {
      id: Date.now(),
      user: displayName,
      username: 'you',
      avatar: myAvatar,
      location: college || 'College Connect',
      image: newImage,
      caption: newCaption.trim(),
      likes: 0,
      liked: false,
      saved: false,
      time: 'Just now',
      comments: [],
    }

    setPosts((current) => [post, ...current])
    setNewCaption('')
    setNewImage('')
    setShowCreatePost(false)
    navigate('home')
  }

  const toggleFollow = (id) => {
    setFollowing((current) =>
      current.includes(id)
        ? current.filter((studentId) => studentId !== id)
        : [...current, id]
    )
  }

  const sendMessage = (e) => {
    e.preventDefault()

    const text = messageInput.trim()
    if (!text) return

    setMessages((current) => ({
      ...current,
      [activeChat.id]: [
        ...(current[activeChat.id] || []),
        { id: Date.now(), text, fromMe: true },
      ],
    }))

    setMessageInput('')
  }

  const PostCard = ({ post }) => (
    <article className="post-card">
      <div className="post-header">
        <img src={post.avatar} alt="" className="avatar" />

        <div className="post-author">
          <strong>{post.user}</strong>
          <span>{post.location} · {post.time}</span>
        </div>

        <MoreHorizontal size={21} />
      </div>

      {post.image && (
        <img
          src={post.image}
          alt="Student post"
          className="post-image"
        />
      )}

      <div className="post-actions">
        <div className="post-actions-left">
          <button
            className={post.liked ? 'icon-button liked' : 'icon-button'}
            onClick={() => toggleLike(post.id)}
            aria-label={post.liked ? 'Unlike' : 'Like'}
          >
            <Heart size={25} fill={post.liked ? 'currentColor' : 'none'} />
          </button>

          <button
            className="icon-button"
            onClick={() =>
              document.getElementById(`comment-${post.id}`)?.focus()
            }
            aria-label="Comment"
          >
            <MessageCircle size={25} />
          </button>

          <button
            className="icon-button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'College Connect',
                  text: post.caption,
                }).catch(() => {})
              } else {
                alert('Sharing is not supported in this browser yet.')
              }
            }}
            aria-label="Share"
          >
            <Send size={24} />
          </button>
        </div>

        <button
          className="icon-button"
          onClick={() => toggleSave(post.id)}
          aria-label={post.saved ? 'Unsave' : 'Save'}
        >
          <Bookmark
            size={24}
            fill={post.saved ? 'currentColor' : 'none'}
          />
        </button>
      </div>

      <div className="post-details">
        <strong>{post.likes.toLocaleString()} likes</strong>

        <p>
          <strong>{post.username}</strong> {post.caption}
        </p>

        <span className="comment-count">
          {post.comments.length} comments
        </span>

        {post.comments.map((comment, index) => (
          <p className="comment-line" key={index}>
            <strong>{comment.user}</strong> {comment.text}
          </p>
        ))}
      </div>

      <form
        className="comment-form"
        onSubmit={(e) => {
          e.preventDefault()
          addComment(post.id)
        }}
      >
        <input
          id={`comment-${post.id}`}
          placeholder="Add a comment..."
          value={commentInputs[post.id] || ''}
          onChange={(e) =>
            setCommentInputs((current) => ({
              ...current,
              [post.id]: e.target.value,
            }))
          }
        />

        <button type="submit">Post</button>
      </form>
    </article>
  )

  const StudentRow = ({ student }) => (
    <div className="student-row">
      <div className="student-info">
        <div className="avatar-wrapper">
          <img src={student.avatar} alt="" className="avatar" />
          {student.online && <span className="online-dot" />}
        </div>

        <div>
          <strong>{student.name}</strong>
          <small>@{student.username}</small>
        </div>
      </div>

      <button
        className="follow-button"
        onClick={() => toggleFollow(student.id)}
      >
        {following.includes(student.id) ? 'Following' : 'Follow'}
      </button>
    </div>
  )

  const Stories = () => (
    <div className="stories">
      <div className="story">
        <div className="story-ring own-story">
          <img src={myAvatar} alt="" />
        </div>
        <span>Your story</span>
      </div>

      {students.map((student) => (
        <button
          key={student.id}
          className="story"
          onClick={() =>
            alert(`Stories for ${student.name} are coming soon!`)
          }
        >
          <div className="story-ring">
            <img src={student.avatar} alt="" />
          </div>
          <span>{student.name.split(' ')[0]}</span>
        </button>
      ))}
    </div>
  )

  // LOGIN AND REGISTRATION SCREEN
  if (!isLoggedIn) {
    return (
      <div className="login-page">
        <div className="cute-pets" aria-hidden="true">
          <div className="white-cat">
            <span className="kitty-ears">♡</span>
            <span className="kitty-face">ᴗ ᴗ</span>
            <span className="kitty-nose">ᴥ</span>
            <span className="kitty-tail" />
          </div>

          <div className="cute-owl">
            <span className="owl-ears" />
            <span className="owl-eyes">
              <span>●</span>
              <span>●</span>
            </span>
            <span className="owl-beak">▼</span>
            <span className="owl-wing" />
          </div>
        </div>

        <div className="login-card">
          <img
            src="/college-logo.png"
            alt="College Logo"
            className="college-logo"
          />

          <h1>College Connect</h1>
          <p className="subtitle">Connect. Share. Belong.</p>

          <h2>
            {isRegistering ? 'Create Your Account' : 'Welcome Back!'}
          </h2>

          <form onSubmit={handleAuth}>
            {isRegistering && (
              <>
                <input
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <input
                  placeholder="College Name"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  required
                />
              </>
            )}

            <input
              type="email"
              placeholder="College Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {isRegistering && (
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            )}

            {!isRegistering && (
              <div className="login-options">
                <label>
                  <input type="checkbox" />
                  Remember me
                </label>

                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault()
                    alert('Password recovery coming soon!')
                  }}
                >
                  Forgot password?
                </a>
              </div>
            )}

            <button type="submit">
              {isRegistering ? 'Create Account' : 'Log In'}
            </button>
          </form>

          <p className="signup-text">
            {isRegistering
              ? 'Already have an account? '
              : "Don't have an account? "}

            <a
              href="#switch"
              onClick={(e) => {
                e.preventDefault()
                setIsRegistering(!isRegistering)
                setPassword('')
                setConfirmPassword('')
              }}
            >
              {isRegistering ? 'Log In' : 'Register'}
            </a>
          </p>
        </div>
      </div>
    )
  }

  // MAIN DASHBOARD
  return (
    <div className="app-layout">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand" onClick={() => navigate('home')}>
          <img src="/college-logo.png" alt="" />
          <div>
            <strong>College Connect</strong>
            <span>YOUR CAMPUS COMMUNITY</span>
          </div>
        </div>

        <div className="sidebar-section-label">MENU</div>

        <nav className="sidebar-nav">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${activePage === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
            >
              <Icon size={21} />
              <span>{label}</span>
              {id === 'notifications' && (
                <span className="notification-badge">
                  {notifications.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-section-label">YOUR CHANNELS</div>

        <div className="sidebar-channels">
          {communities.slice(0, 4).map((channel) => (
            <button
              key={channel.id}
              onClick={() => {
                setActiveChannel(channel.name)
                navigate('communities')
              }}
            >
              <Hash size={17} />
              {channel.name}
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <img src={myAvatar} alt="" className="avatar" />
          <div>
            <strong>{displayName}</strong>
            <small>Online 🟢</small>
          </div>
          <button
            className="icon-button"
            title="Log out"
            onClick={() => setIsLoggedIn(false)}
          >
            <LogOut size={19} />
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>

            <div>
              <h2>
                {activePage === 'home'
                  ? 'Home Feed'
                  : activePage.charAt(0).toUpperCase() +
                    activePage.slice(1)}
              </h2>
              <p>Welcome to your campus community 💜</p>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="top-create-button"
              onClick={() => setShowCreatePost(true)}
            >
              <PlusSquare size={18} />
              <span>Create Post</span>
            </button>

            <button
              className="icon-button"
              onClick={() => navigate('notifications')}
            >
              <Bell size={22} />
            </button>

            <img
              src={myAvatar}
              alt="Your profile"
              className="avatar clickable"
              onClick={() => navigate('profile')}
            />
          </div>
        </header>

        <div className="dashboard-content">
          <main className="content-column">

            {/* HOME */}
            {activePage === 'home' && (
              <>
                <div className="welcome-banner">
                  <div>
                    <span className="eyebrow">YOUR CAMPUS, YOUR WORLD</span>
                    <h1>Hey, {displayName.split(' ')[0]}! 👋</h1>
                    <p>
                      Discover what's happening around your college.
                    </p>
                  </div>

                  <GraduationCap size={75} />
                </div>

                <Stories />

                <div className="section-heading">
                  <h3>Latest Posts</h3>
                  <span>From your campus</span>
                </div>

                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </>
            )}

            {/* SEARCH */}
            {activePage === 'search' && (
              <div className="page-panel">
                <h2>Find Your People 🔎</h2>
                <p>Search for students in your campus community.</p>

                <div className="search-box">
                  <Search size={21} />
                  <input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {students
                  .filter((student) =>
                    `${student.name} ${student.username}`
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                  )
                  .map((student) => (
                    <StudentRow key={student.id} student={student} />
                  ))}
              </div>
            )}

            {/* EXPLORE */}
            {activePage === 'explore' && (
              <div className="page-panel">
                <h2>Explore Campus ✨</h2>
                <p>Discover moments shared by students.</p>

                <div className="explore-grid">
                  {posts
                    .filter((post) => post.image)
                    .map((post) => (
                      <img
                        key={post.id}
                        src={post.image}
                        alt={post.caption}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* MESSAGES */}
            {activePage === 'messages' && (
              <div className="messages-layout">
                <div className="chat-list">
                  <h3>Direct Messages</h3>

                  {students.map((student) => (
                    <button
                      key={student.id}
                      className={`chat-person ${
                        activeChat.id === student.id ? 'selected' : ''
                      }`}
                      onClick={() => setActiveChat(student)}
                    >
                      <img
                        src={student.avatar}
                        alt=""
                        className="avatar"
                      />

                      <div>
                        <strong>{student.name}</strong>
                        <small>
                          {student.online ? 'Online' : 'Offline'}
                        </small>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="chat-window">
                  <div className="chat-header">
                    <img
                      src={activeChat.avatar}
                      alt=""
                      className="avatar"
                    />

                    <div>
                      <strong>{activeChat.name}</strong>
                      <small>
                        {activeChat.online ? '🟢 Online' : 'Offline'}
                      </small>
                    </div>
                  </div>

                  <div className="chat-messages">
                    <div className="chat-empty">
                      <MessageCircle size={40} />
                      <h3>Chat with {activeChat.name}</h3>
                      <p>Start a conversation!</p>
                    </div>

                    {(messages[activeChat.id] || []).map((message) => (
                      <div
                        key={message.id}
                        className="chat-bubble"
                      >
                        {message.text}
                      </div>
                    ))}
                  </div>

                  <form className="chat-input" onSubmit={sendMessage}>
                    <input
                      placeholder={`Message ${activeChat.name}...`}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                    />

                    <button type="submit">
                      <Send size={19} />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {activePage === 'notifications' && (
              <div className="page-panel">
                <h2>Notifications 🔔</h2>
                <p>See what's happening in your community.</p>

                {notifications.map((notification, index) => (
                  <div className="notification-item" key={index}>
                    <div className="notification-icon">
                      <Heart size={20} />
                    </div>

                    <span>{notification}</span>
                  </div>
                ))}
              </div>
            )}

            {/* COMMUNITIES */}
            {activePage === 'communities' && (
              <div className="page-panel">
                <h2>Campus Communities 🎓</h2>
                <p>Find your favorite campus channels.</p>

                <div className="community-list">
                  {communities.map((channel) => (
                    <button
                      key={channel.id}
                      className={`community-item ${
                        activeChannel === channel.name ? 'selected' : ''
                      }`}
                      onClick={() => setActiveChannel(channel.name)}
                    >
                      <Hash size={22} />

                      <div>
                        <strong>{channel.name}</strong>
                        <small>College Connect community</small>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="channel-preview">
                  <Hash size={38} />
                  <h3>Welcome to #{activeChannel}</h3>
                  <p>
                    Channel conversations will appear here when
                    we build the backend.
                  </p>
                </div>
              </div>
            )}

            {/* PROFILE */}
            {activePage === 'profile' && (
              <div className="page-panel">
                <div className="profile-header">
                  <img src={myAvatar} alt="" />

                  <div>
                    <h2>{displayName}</h2>
                    <p>{college || 'College Connect Student'}</p>

                    <div className="profile-stats">
                      <span>
                        <strong>
                          {posts.filter((post) => post.username === 'you').length}
                        </strong>
                        Posts
                      </span>

                      <span>
                        <strong>0</strong>
                        Followers
                      </span>

                      <span>
                        <strong>{following.length}</strong>
                        Following
                      </span>
                    </div>
                  </div>
                </div>

                <h3>Your Posts</h3>

                {posts.filter((post) => post.username === 'you').length === 0 ? (
                  <div className="empty-state">
                    <Camera size={44} />
                    <h3>No posts yet</h3>
                    <p>Share your first campus moment!</p>

                    <button
                      className="primary-button"
                      onClick={() => setShowCreatePost(true)}
                    >
                      Create Post
                    </button>
                  </div>
                ) : (
                  posts
                    .filter((post) => post.username === 'you')
                    .map((post) => <PostCard key={post.id} post={post} />)
                )}
              </div>
            )}

            {/* SETTINGS */}
            {activePage === 'settings' && (
              <div className="page-panel">
                <h2>Settings ⚙️</h2>
                <p>Manage your College Connect experience.</p>

                <div className="settings-item">
                  <strong>Account Name</strong>
                  <span>{displayName}</span>
                </div>

                <div className="settings-item">
                  <strong>Email</strong>
                  <span>{email}</span>
                </div>

                <div className="settings-item">
                  <strong>College</strong>
                  <span>{college || 'Not set'}</span>
                </div>

                <button
                  className="logout-button"
                  onClick={() => setIsLoggedIn(false)}
                >
                  <LogOut size={18} />
                  Log Out
                </button>
              </div>
            )}

          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="right-sidebar">
            <div className="right-card">
              <div className="right-heading">
                <h3>Online Students</h3>
                <span>● Live</span>
              </div>

              {students
                .filter((student) => student.online)
                .map((student) => (
                  <div className="online-student" key={student.id}>
                    <div className="avatar-wrapper">
                      <img
                        src={student.avatar}
                        alt=""
                        className="avatar"
                      />
                      <span className="online-dot" />
                    </div>

                    <div>
                      <strong>{student.name}</strong>
                      <small>Online now</small>
                    </div>
                  </div>
                ))}
            </div>

            <div className="right-card">
              <h3>Suggested Students</h3>

              {students.slice(0, 3).map((student) => (
                <StudentRow key={student.id} student={student} />
              ))}
            </div>

            <div className="right-card campus-card">
              <GraduationCap size={32} />
              <h3>Campus Community</h3>
              <p>
                Connect with students, share memories,
                and discover campus events.
              </p>

              <button onClick={() => navigate('communities')}>
                Explore Communities
              </button>
            </div>

            <p className="footer-note">
              College Connect © 2026
              <br />
              Made for students 💜
            </p>
          </aside>
        </div>
      </div>

      {/* CREATE POST MODAL */}
      {showCreatePost && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreatePost(false)}
        >
          <div
            className="create-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Create a Post</h2>

              <button
                className="icon-button"
                onClick={() => setShowCreatePost(false)}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={createPost}>
              <div className="modal-user">
                <img src={myAvatar} alt="" className="avatar" />
                <strong>{displayName}</strong>
              </div>

              <textarea
                placeholder="What's happening on campus?"
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                rows={4}
              />

              {newImage && (
                <img
                  src={newImage}
                  alt="Upload preview"
                  className="upload-preview"
                />
              )}

              <label className="upload-label">
                <ImageIcon size={21} />
                Add Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  hidden
                />
              </label>

              <button type="submit" className="primary-button">
                Share Post
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App