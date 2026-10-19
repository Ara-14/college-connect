import { useState } from 'react'
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
  Check,
  BookOpen,
  Eye,
  Target,
  Code,
  Cloud,
  Database,
  Sparkles,
  Calendar,
  ChevronRight,
  Download,
  UploadCloud,
  FileText,
  ArrowRight,
  Lock,
  Layers,
  Paperclip,
  Award,
} from 'lucide-react'

import './App.css'

const initialPosts = [
  {
    id: 1,
    user: 'Aarav Sharma',
    username: 'aarav_sharma',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    location: 'Computer Science Department',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1000',
    caption: 'Another beautiful day on campus! 🎓✨ Working on the new algorithm assignment.',
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
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
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
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    location: 'Coding Club Lab',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000',
    caption: 'Late-night coding sessions hit different! 💻🔥 Hackathon prep underway.',
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
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    online: true,
  },
  {
    id: 2,
    name: 'Priya Reddy',
    username: 'priya_reddy',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    online: true,
  },
  {
    id: 3,
    name: 'Rahul Kumar',
    username: 'rahul_codes',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    online: false,
  },
  {
    id: 4,
    name: 'Sneha Patel',
    username: 'sneha_art',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    online: true,
  },
]

const initialCourses = [
  {
    id: 'dsa',
    title: 'Data Structures & Algorithms',
    code: '21CS32',
    department: 'Computer Science',
    semester: '3rd Sem',
    description: 'Learn core concepts and solve problems',
    icon: 'code',
    status: 'In Progress',
    colorScheme: 'lavender',
    progress: 45,
    doodle: '💡',
    resources: [
      {
        id: 1,
        title: 'Module 1 & 2: Stacks, Queues & Linked Lists Hand-Written Notes',
        type: 'Notes',
        format: 'PDF',
        size: '3.4 MB',
        uploadedBy: 'Prof. Ramesh K. (CSE HOD)',
        date: 'Oct 14, 2026',
      },
      {
        id: 2,
        title: 'VTU Model Question Paper 2024 (Solved with Marking Scheme)',
        type: 'Question Paper',
        format: 'PDF',
        size: '1.8 MB',
        uploadedBy: 'Prof. Ramesh K. (CSE HOD)',
        date: 'Oct 10, 2026',
      },
      {
        id: 3,
        title: 'Data Structures Laboratory Manual (Programs 1 to 12 with Outputs)',
        type: 'Lab Manual',
        format: 'PDF',
        size: '4.2 MB',
        uploadedBy: 'Prof. Ramesh K. (CSE HOD)',
        date: 'Sep 28, 2026',
      },
    ],
  },
  {
    id: 'cloud',
    title: 'Cloud Computing (AWS)',
    code: '21CS52',
    department: 'Computer Science & Cloud Tech',
    semester: '5th Sem',
    description: 'Build real world skills with AWS',
    icon: 'cloud',
    status: 'New',
    colorScheme: 'peach',
    progress: 20,
    doodle: '☁️',
    resources: [
      {
        id: 4,
        title: 'AWS EC2, S3, IAM & Serverless Architecture Lecture Slides',
        type: 'Notes',
        format: 'PDF',
        size: '5.1 MB',
        uploadedBy: 'Dr. Ananya Sharma (Assistant Prof)',
        date: 'Oct 17, 2026',
      },
      {
        id: 5,
        title: 'Mid-Term Exam Practice Question Bank with Solutions',
        type: 'Question Paper',
        format: 'PDF',
        size: '2.1 MB',
        uploadedBy: 'Dr. Ananya Sharma (Assistant Prof)',
        date: 'Oct 15, 2026',
      },
    ],
  },
  {
    id: 'dbms',
    title: 'Database Management Systems',
    code: '21CS42',
    department: 'Information Science & CSE',
    semester: '4th Sem',
    description: 'SQL, Normalization & Relational models',
    icon: 'database',
    status: 'Updated',
    colorScheme: 'mint',
    progress: 80,
    doodle: '⚡',
    resources: [
      {
        id: 6,
        title: 'Normalization (1NF, 2NF, 3NF, BCNF) with Real World Examples',
        type: 'Notes',
        format: 'PDF',
        size: '2.9 MB',
        uploadedBy: 'Prof. Sunitha Rao',
        date: 'Oct 12, 2026',
      },
      {
        id: 7,
        title: 'Previous 5 Years VTU Exam Question Papers (2019-2024)',
        type: 'Question Paper',
        format: 'PDF',
        size: '6.5 MB',
        uploadedBy: 'Prof. Sunitha Rao',
        date: 'Oct 02, 2026',
      },
    ],
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
  const [userRole, setUserRole] = useState('STUDENT') // 'STUDENT' or 'FACULTY'

  // User input states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [college, setCollege] = useState('Visvesvaraya Technological University')
  const [department, setDepartment] = useState('Computer Science')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Navigation & Feed state
  const [activePage, setActivePage] = useState('home')
  const [feedMode, setFeedMode] = useState('learning') // 'learning' (new visual feed) or 'social' (Instagram feed)
  const [activeFilter, setActiveFilter] = useState('all') // 'all', 'learn', 'visual', 'focus'
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Academic Courses & Resources
  const [courses, setCourses] = useState(initialCourses)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [showCourseDrawer, setShowCourseDrawer] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Teacher Upload Resource Form
  const [newResourceTitle, setNewResourceTitle] = useState('')
  const [newResourceSubject, setNewResourceSubject] = useState('dsa')
  const [newResourceType, setNewResourceType] = useState('Notes')
  const [newResourceFile, setNewResourceFile] = useState(null)

  // Social & Posts state
  const [posts, setPosts] = useState(initialPosts)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [newCaption, setNewCaption] = useState('')
  const [newImage, setNewImage] = useState('')
  const [commentInputs, setCommentInputs] = useState({})
  const [following, setFollowing] = useState([])
  const [activeChat, setActiveChat] = useState(students[0])
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState({})
  const [activeChannel, setActiveChannel] = useState('general')
  const [notifications, setNotifications] = useState([
    'Prof. Ramesh uploaded Module 2 Notes for DSA 📚',
    'Priya liked your campus post ❤️',
    'Coding Club announced Hackathon 2026 💻',
  ])

  const displayName = fullName.trim() || (userRole === 'FACULTY' ? 'Prof. Arasu' : 'Arasu')

  const myAvatar =
    userRole === 'FACULTY'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'

  const navigation = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'vault', label: 'Academic Vault', icon: Sparkles },
    { id: 'messages', label: 'Chat', icon: MessageCircle },
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

    setIsLoggedIn(true)
    setActivePage('home')
  }

  const handleTeacherUpload = (e) => {
    e.preventDefault()

    if (!newResourceTitle.trim()) {
      alert('Please enter a title for the resource.')
      return
    }

    const newResource = {
      id: Date.now(),
      title: newResourceTitle.trim(),
      type: newResourceType,
      format: 'PDF',
      size: '2.5 MB',
      uploadedBy: `${displayName} (${department})`,
      date: 'Just now',
    }

    setCourses((prevCourses) =>
      prevCourses.map((c) =>
        c.id === newResourceSubject
          ? { ...c, resources: [newResource, ...c.resources] }
          : c
      )
    )

    alert(`✅ Resource successfully published to ${newResourceType} vault! Students can now access and download it.`)

    setNewResourceTitle('')
    setNewResourceFile(null)
    setShowUploadModal(false)
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
        post.id === id ? { ...post, saved: !post.saved } : post
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
              comments: [...post.comments, { user: displayName, text }],
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
      username: displayName.toLowerCase().replace(/\s+/g, '_'),
      avatar: myAvatar,
      location: college || 'College Connect Campus',
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
    setFeedMode('social')
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

  // Filter courses based on search
  const filteredCourses = courses.filter((c) =>
    searchQuery
      ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  )

  // ==========================================
  // LOGIN AND REGISTRATION SCREEN
  // ==========================================
  if (!isLoggedIn) {
    return (
      <div className="login-page">
        {/* Animated Mascots Preserved */}
        <div className="cute-pets" aria-hidden="true">
          <div className="white-cat" title="College Connect Mascot">
            <span className="kitty-ears">♡</span>
            <span className="kitty-face">ᴗ ᴗ</span>
            <span className="kitty-nose">ᴥ</span>
            <span className="kitty-tail" />
          </div>

          <div className="cute-owl" title="Study Buddy">
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
            alt="VTU College Logo"
            className="college-logo"
          />

          <h1>College Connect</h1>
          <p className="subtitle">Connect. Share. Learn. Belong.</p>

          {/* Role Selector: Student vs Faculty */}
          <div className="role-switch-container">
            <button
              type="button"
              className={`role-tab ${userRole === 'STUDENT' ? 'active' : ''}`}
              onClick={() => setUserRole('STUDENT')}
            >
              🎒 Student Portal
            </button>
            <button
              type="button"
              className={`role-tab ${userRole === 'FACULTY' ? 'active' : ''}`}
              onClick={() => setUserRole('FACULTY')}
            >
              👨‍🏫 Faculty / Teacher
            </button>
          </div>

          <h2>
            {isRegistering
              ? `Create ${userRole === 'FACULTY' ? 'Faculty' : 'Student'} Account`
              : `Welcome Back, ${userRole === 'FACULTY' ? 'Professor!' : 'Student!'}`}
          </h2>

          <form onSubmit={handleAuth}>
            {isRegistering && (
              <>
                <input
                  placeholder={userRole === 'FACULTY' ? 'Full Name (e.g. Prof. Arasu)' : 'Full Name (e.g. Arasu)'}
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

                <input
                  placeholder="Department (e.g. Computer Science)"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />
              </>
            )}

            <input
              type="email"
              placeholder={userRole === 'FACULTY' ? 'Faculty Email (@college.edu / @vtu.ac.in)' : 'College Student Email'}
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
                  <input type="checkbox" defaultChecked />
                  Remember me
                </label>

                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault()
                    alert('Password recovery link sent to your college email!')
                  }}
                >
                  Forgot password?
                </a>
              </div>
            )}

            <button type="submit" className="login-submit-btn">
              {isRegistering ? 'Create Account' : `Log In as ${userRole === 'FACULTY' ? 'Faculty' : 'Student'}`}
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

  // ==========================================
  // MAIN APPLICATION DASHBOARD
  // ==========================================
  return (
    <div className="app-layout">
      {/* LEFT NAVIGATION SIDEBAR */}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand" onClick={() => navigate('home')}>
          <img src="/college-logo.png" alt="College Logo" />
          <div>
            <strong>College Connect</strong>
            <span>CAMPUS LEARNING & SOCIAL</span>
          </div>
        </div>

        {/* Role Identity Tag */}
        <div className="user-role-badge">
          {userRole === 'FACULTY' ? (
            <span className="badge-faculty">
              <Award size={15} /> Verified Faculty
            </span>
          ) : (
            <span className="badge-student">
              <GraduationCap size={15} /> Student
            </span>
          )}
        </div>

        <div className="sidebar-section-label">MENU</div>

        <nav className="sidebar-nav">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${activePage === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
              {id === 'home' && <span className="nav-pip" />}
              {id === 'vault' && (
                <span className="vault-pill">Vault</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-section-label">COMMUNITY CHANNELS</div>

        <div className="sidebar-channels">
          {communities.map((channel) => (
            <button
              key={channel.id}
              className={activeChannel === channel.name ? 'active-channel' : ''}
              onClick={() => {
                setActiveChannel(channel.name)
                navigate('communities')
              }}
            >
              <Hash size={16} />
              {channel.name}
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <img src={myAvatar} alt="" className="avatar" />
          <div className="sidebar-user-info">
            <strong>{displayName}</strong>
            <small>{userRole === 'FACULTY' ? 'Professor · Online 🟢' : 'Student · Online 🟢'}</small>
          </div>
          <button
            className="icon-button"
            title="Log out"
            onClick={() => setIsLoggedIn(false)}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* MAIN SCREEN AREA */}
      <div className="main-area">
        {/* RESPONSIVE TOP HEADER / APP BAR */}
        <header className="feed-header-bar">
          <div className="header-user-profile">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div className="avatar-ring-container" onClick={() => navigate('profile')}>
              <img src={myAvatar} alt={displayName} className="header-avatar" />
            </div>

            <div className="header-greeting-box">
              <span className="greeting-sub">Hello,</span>
              <h2 className="greeting-name">{displayName.split(' ')[0]}</h2>
            </div>
          </div>

          <div className="header-action-group">
            {/* Faculty Exclusive Upload Button */}
            {userRole === 'FACULTY' ? (
              <button
                className="faculty-upload-trigger-btn"
                onClick={() => setShowUploadModal(true)}
              >
                <UploadCloud size={18} />
                <span>Upload Notes / Papers</span>
              </button>
            ) : (
              <button
                className="feed-switch-btn"
                onClick={() => setFeedMode(feedMode === 'learning' ? 'social' : 'learning')}
                title="Switch between Learning Vault and Campus Social Feed"
              >
                {feedMode === 'learning' ? (
                  <>
                    <Camera size={16} />
                    <span>Campus Feed</span>
                  </>
                ) : (
                  <>
                    <BookOpen size={16} />
                    <span>My Courses</span>
                  </>
                )}
              </button>
            )}

            <button
              className="notification-bell-btn"
              onClick={() => navigate('notifications')}
              aria-label="Notifications"
            >
              <Bell size={21} />
              <span className="bell-red-dot" />
            </button>
          </div>
        </header>

        {/* FEED / CONTENT CONTAINER */}
        <div className="dashboard-content">
          <main className="content-column">

            {/* ======================================================== */}
            {/* HOME VIEW: EXACT RECREATION OF USER'S INSPIRATION DESIGN */}
            {/* ======================================================== */}
            {activePage === 'home' && (
              <>
                {/* SEARCH BAR (Matching mockup: "Search subjects, notes, or ask AI...") */}
                <div className="modern-search-bar">
                  <Search size={19} className="search-icon-svg" />
                  <input
                    type="text"
                    placeholder="Search subjects, notes, or ask AI..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      className="search-clear-btn"
                      onClick={() => setSearchQuery('')}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* MODE TOGGLER TABS (Academics & Notes vs Campus Social) */}
                <div className="feed-mode-tabs">
                  <button
                    className={`mode-tab ${feedMode === 'learning' ? 'active' : ''}`}
                    onClick={() => setFeedMode('learning')}
                  >
                    <Sparkles size={16} />
                    <span>Learning & Vault</span>
                  </button>

                  <button
                    className={`mode-tab ${feedMode === 'social' ? 'active' : ''}`}
                    onClick={() => setFeedMode('social')}
                  >
                    <Heart size={16} />
                    <span>Campus Moments</span>
                  </button>
                </div>

                {/* 1. LEARNING FEED (Matching the exact mobile UI screenshot) */}
                {feedMode === 'learning' && (
                  <div className="learning-feed-view">
                    {/* FEATURED HERO CARD: "YOUR LEARNING JOURNEY" */}
                    <div className="learning-hero-card">
                      <div className="hero-content-col">
                        <span className="hero-tag">YOUR LEARNING JOURNEY</span>
                        <h1 className="hero-title">
                          Learn today, <br />
                          build tomorrow
                        </h1>
                        <p className="hero-desc">
                          Study smarter with personalized plans, resources and AI support.
                        </p>

                        <button
                          className="continue-btn"
                          onClick={() => {
                            setSelectedCourse(courses[0])
                            setShowCourseDrawer(true)
                          }}
                        >
                          <span>Continue learning</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>

                      {/* 3D Infinity Ring Graphic with Twinkling Sparkles */}
                      <div className="hero-visual-col">
                        <div className="abstract-torus-wrap">
                          <div className="torus-ring" />
                          <div className="sparkle-star s1">✦</div>
                          <div className="sparkle-star s2">★</div>
                          <div className="sparkle-star s3">✦</div>
                        </div>
                      </div>

                      {/* Progress Bar at bottom of card */}
                      <div className="hero-card-progress">
                        <div className="hero-progress-track">
                          <div
                            className="hero-progress-bar"
                            style={{ width: '50%' }}
                          />
                        </div>
                        <span className="hero-progress-label">3 / 6 modules</span>
                      </div>
                    </div>

                    {/* QUICK FILTER CHIPS (Learn, Visual, Focus) */}
                    <div className="quick-chips-row">
                      <button
                        className={`chip-button ${activeFilter === 'learn' ? 'active' : ''}`}
                        onClick={() =>
                          setActiveFilter(activeFilter === 'learn' ? 'all' : 'learn')
                        }
                      >
                        <div className="chip-icon-box blue-chip">
                          <BookOpen size={16} />
                        </div>
                        <span className="chip-label">Learn</span>
                        <ChevronRight size={15} className="chip-arrow" />
                      </button>

                      <button
                        className={`chip-button ${activeFilter === 'visual' ? 'active' : ''}`}
                        onClick={() =>
                          setActiveFilter(activeFilter === 'visual' ? 'all' : 'visual')
                        }
                      >
                        <div className="chip-icon-box purple-chip">
                          <Eye size={16} />
                        </div>
                        <span className="chip-label">Visual</span>
                        <ChevronRight size={15} className="chip-arrow" />
                      </button>

                      <button
                        className={`chip-button ${activeFilter === 'focus' ? 'active' : ''}`}
                        onClick={() =>
                          setActiveFilter(activeFilter === 'focus' ? 'all' : 'focus')
                        }
                      >
                        <div className="chip-icon-box mint-chip">
                          <Target size={16} />
                        </div>
                        <span className="chip-label">Focus</span>
                        <ChevronRight size={15} className="chip-arrow" />
                      </button>
                    </div>

                    {/* "MY COURSES" SECTION HEADER */}
                    <div className="courses-section-header">
                      <h3>My Courses</h3>
                      <button
                        className="view-all-link"
                        onClick={() => navigate('vault')}
                      >
                        <span>View all</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    {/* COURSES CARDS (Horizontal Scroll / Grid) */}
                    <div className="courses-grid-container">
                      {filteredCourses.map((course) => (
                        <div
                          key={course.id}
                          className={`course-card ${course.colorScheme}`}
                          onClick={() => {
                            setSelectedCourse(course)
                            setShowCourseDrawer(true)
                          }}
                        >
                          <div className="course-card-top">
                            <div className="course-icon-square">
                              {course.icon === 'code' && <Code size={20} />}
                              {course.icon === 'cloud' && <Cloud size={20} />}
                              {course.icon === 'database' && <Database size={20} />}
                            </div>

                            <span className="status-pill">{course.status}</span>
                            <span className="course-doodle-icon">{course.doodle}</span>
                          </div>

                          <div className="course-card-content">
                            <h4 className="course-title">{course.title}</h4>
                            <p className="course-desc">{course.description}</p>
                          </div>

                          <div className="course-card-footer">
                            <div className="course-progress-track">
                              <div
                                className="course-progress-fill"
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>
                            <span className="course-percent">{course.progress}%</span>
                          </div>

                          <div className="course-resources-footer">
                            <FileText size={13} />
                            <span>{course.resources.length} verified resources</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. CAMPUS SOCIAL MOMENTS (Instagram-style Posts & Stories) */}
                {feedMode === 'social' && (
                  <div className="social-feed-view">
                    {/* Stories Tray */}
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

                    <div className="section-heading">
                      <h3>Campus Moments</h3>
                      <button
                        className="create-post-pill-btn"
                        onClick={() => setShowCreatePost(true)}
                      >
                        <PlusSquare size={16} />
                        <span>Share Post</span>
                      </button>
                    </div>

                    {posts.map((post) => (
                      <article className="post-card" key={post.id}>
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
                            >
                              <Heart size={24} fill={post.liked ? 'currentColor' : 'none'} />
                            </button>

                            <button
                              className="icon-button"
                              onClick={() =>
                                document.getElementById(`comment-${post.id}`)?.focus()
                              }
                            >
                              <MessageCircle size={24} />
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
                                  alert('Share link copied to clipboard!')
                                }
                              }}
                            >
                              <Send size={22} />
                            </button>
                          </div>

                          <button
                            className="icon-button"
                            onClick={() => toggleSave(post.id)}
                          >
                            <Bookmark
                              size={22}
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
                              setCommentInputs((curr) => ({
                                ...curr,
                                [post.id]: e.target.value,
                              }))
                            }
                          />
                          <button type="submit">Post</button>
                        </form>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ======================================================== */}
            {/* ACADEMIC VAULT (Teacher Uploads & Question Papers) */}
            {/* ======================================================== */}
            {activePage === 'vault' && (
              <div className="page-panel">
                <div className="vault-header-row">
                  <div>
                    <h2>Academic Resource Vault 📚</h2>
                    <p>Verified notes, previous VTU question papers & lab manuals.</p>
                  </div>

                  {userRole === 'FACULTY' ? (
                    <button
                      className="primary-button"
                      onClick={() => setShowUploadModal(true)}
                    >
                      <UploadCloud size={18} />
                      <span>Upload New Resource</span>
                    </button>
                  ) : (
                    <span className="vault-info-tag">
                      <Lock size={14} /> Teacher Verified Only
                    </span>
                  )}
                </div>

                <div className="vault-categories-grid">
                  {courses.map((course) => (
                    <div key={course.id} className="vault-course-card">
                      <div className="vault-course-header">
                        <div>
                          <span className="vault-subject-code">{course.code}</span>
                          <h3>{course.title}</h3>
                          <small>{course.department} · {course.semester}</small>
                        </div>

                        <button
                          className="open-vault-btn"
                          onClick={() => {
                            setSelectedCourse(course)
                            setShowCourseDrawer(true)
                          }}
                        >
                          View {course.resources.length} Resources <ChevronRight size={15} />
                        </button>
                      </div>

                      <div className="vault-resource-list">
                        {course.resources.map((res) => (
                          <div key={res.id} className="vault-resource-item">
                            <div className="res-file-icon">
                              <FileText size={20} />
                            </div>

                            <div className="res-details">
                              <strong>{res.title}</strong>
                              <span>
                                {res.type} · {res.size} · Uploaded by {res.uploadedBy}
                              </span>
                            </div>

                            <button
                              className="download-pill-btn"
                              onClick={() =>
                                alert(`Downloading: ${res.title}\nFormat: ${res.format}\nVerified source.`)
                              }
                            >
                              <Download size={14} />
                              <span>Download</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SCHEDULE TAB */}
            {activePage === 'schedule' && (
              <div className="page-panel">
                <h2>Campus & Exam Schedule 📅</h2>
                <p>Upcoming lectures, labs, and VTU finals.</p>

                <div className="schedule-card-list">
                  <div className="schedule-item">
                    <div className="schedule-time">09:30 AM</div>
                    <div className="schedule-info">
                      <strong>Data Structures & Algorithms Lecture</strong>
                      <span>Room 304 · Prof. Ramesh K.</span>
                    </div>
                    <span className="schedule-status live">Today</span>
                  </div>

                  <div className="schedule-item">
                    <div className="schedule-time">01:30 PM</div>
                    <div className="schedule-info">
                      <strong>Cloud Computing AWS Lab Session</strong>
                      <span>Lab 2, 4th Floor · Dr. Ananya Sharma</span>
                    </div>
                    <span className="schedule-status">Upcoming</span>
                  </div>

                  <div className="schedule-item exam-item">
                    <div className="schedule-time">NOV 15</div>
                    <div className="schedule-info">
                      <strong>VTU Theory Examination Begins</strong>
                      <span>Semester Final Papers</span>
                    </div>
                    <span className="schedule-status exam">Finals in 26 Days</span>
                  </div>
                </div>
              </div>
            )}

            {/* MESSAGES TAB */}
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
                      <img src={student.avatar} alt="" className="avatar" />
                      <div>
                        <strong>{student.name}</strong>
                        <small>{student.online ? 'Online' : 'Offline'}</small>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="chat-window">
                  <div className="chat-header">
                    <img src={activeChat.avatar} alt="" className="avatar" />
                    <div>
                      <strong>{activeChat.name}</strong>
                      <small>{activeChat.online ? '🟢 Online' : 'Offline'}</small>
                    </div>
                  </div>

                  <div className="chat-messages">
                    <div className="chat-empty">
                      <MessageCircle size={36} />
                      <h3>Chat with {activeChat.name}</h3>
                      <p>Share notes, study questions, or talk campus events.</p>
                    </div>

                    {(messages[activeChat.id] || []).map((msg) => (
                      <div key={msg.id} className="chat-bubble">
                        {msg.text}
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
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activePage === 'notifications' && (
              <div className="page-panel">
                <h2>Notifications 🔔</h2>
                <p>Stay updated on college notes, club events, and friends.</p>

                {notifications.map((note, index) => (
                  <div className="notification-item" key={index}>
                    <div className="notification-icon">
                      <Bell size={18} />
                    </div>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            )}

            {/* COMMUNITIES TAB */}
            {activePage === 'communities' && (
              <div className="page-panel">
                <h2>Campus Communities 🎓</h2>
                <p>Discord-inspired community channels for your college.</p>

                <div className="community-list">
                  {communities.map((channel) => (
                    <button
                      key={channel.id}
                      className={`community-item ${
                        activeChannel === channel.name ? 'selected' : ''
                      }`}
                      onClick={() => setActiveChannel(channel.name)}
                    >
                      <Hash size={20} />
                      <div>
                        <strong>{channel.name}</strong>
                        <small>College Connect community</small>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="channel-preview">
                  <Hash size={36} />
                  <h3>Welcome to #{activeChannel}</h3>
                  <p>Channel conversations & student discussions.</p>
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {activePage === 'profile' && (
              <div className="page-panel">
                <div className="profile-header">
                  <img src={myAvatar} alt="" />

                  <div>
                    <h2>{displayName}</h2>
                    <p>{department} · {college}</p>
                    <span className="profile-role-tag">
                      {userRole === 'FACULTY' ? '👨‍🏫 Verified Faculty' : '🎒 College Student'}
                    </span>

                    <div className="profile-stats">
                      <span>
                        <strong>{posts.filter((p) => p.username === 'you' || p.user === displayName).length}</strong> Posts
                      </span>
                      <span><strong>184</strong> Followers</span>
                      <span><strong>{following.length + 42}</strong> Following</span>
                    </div>
                  </div>
                </div>

                <h3>Your Shared Moments</h3>
                <div className="empty-state">
                  <Camera size={40} />
                  <p>Share your campus moments, study groups, or project updates.</p>
                  <button
                    className="primary-button"
                    onClick={() => setShowCreatePost(true)}
                  >
                    Create Post
                  </button>
                </div>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activePage === 'settings' && (
              <div className="page-panel">
                <h2>Settings ⚙️</h2>
                <div className="settings-item">
                  <strong>Account Name</strong>
                  <span>{displayName}</span>
                </div>
                <div className="settings-item">
                  <strong>Role</strong>
                  <span>{userRole === 'FACULTY' ? 'Faculty Member' : 'Student'}</span>
                </div>
                <div className="settings-item">
                  <strong>College</strong>
                  <span>{college}</span>
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

          {/* RIGHT SIDEBAR (Desktop Widgets) */}
          <aside className="right-sidebar">
            {/* Quick Mascot Study Companion */}
            <div className="right-card study-companion-card">
              <div className="companion-header">
                <GraduationCap size={24} />
                <strong>Study Companion</strong>
              </div>
              <p>
                {userRole === 'FACULTY'
                  ? 'Your uploaded notes help hundreds of students prepare for VTU exams!'
                  : 'You have completed 3 of 6 modules this semester. Keep going! 🚀'}
              </p>
            </div>

            {/* Online Students Card */}
            <div className="right-card">
              <div className="right-heading">
                <h3>Online Students</h3>
                <span>● Live</span>
              </div>

              {students
                .filter((s) => s.online)
                .map((student) => (
                  <div className="online-student" key={student.id}>
                    <div className="avatar-wrapper">
                      <img src={student.avatar} alt="" className="avatar" />
                      <span className="online-dot" />
                    </div>
                    <div>
                      <strong>{student.name}</strong>
                      <small>Online now</small>
                    </div>
                  </div>
                ))}
            </div>

            {/* Academic Announcements */}
            <div className="right-card campus-card">
              <Sparkles size={28} />
              <h3>Academic Notes Vault</h3>
              <p>
                Teacher verified syllabus notes and previous VTU question papers are ready.
              </p>
              <button onClick={() => navigate('vault')}>
                Browse Vault
              </button>
            </div>

            <p className="footer-note">
              College Connect © 2026
              <br />
              Made for Students & Teachers 💜
            </p>
          </aside>
        </div>

        {/* ======================================================== */}
        {/* MOBILE BOTTOM NAVIGATION BAR (Matching screenshot exactly) */}
        {/* ======================================================== */}
        <nav className="mobile-bottom-nav">
          <button
            className={`bottom-nav-item ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => navigate('home')}
          >
            <Home size={22} />
            <span>Home</span>
          </button>

          <button
            className={`bottom-nav-item ${activePage === 'schedule' ? 'active' : ''}`}
            onClick={() => navigate('schedule')}
          >
            <Calendar size={22} />
            <span>Schedule</span>
          </button>

          <button
            className={`bottom-nav-item ${activePage === 'vault' ? 'active' : ''}`}
            onClick={() => navigate('vault')}
          >
            <Sparkles size={22} />
            <span>Vault</span>
          </button>

          <button
            className={`bottom-nav-item ${activePage === 'messages' ? 'active' : ''}`}
            onClick={() => navigate('messages')}
          >
            <MessageCircle size={22} />
            <span>Chat</span>
          </button>

          <button
            className={`bottom-nav-item ${activePage === 'profile' ? 'active' : ''}`}
            onClick={() => navigate('profile')}
          >
            <User size={22} />
            <span>Profile</span>
          </button>
        </nav>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: TEACHER RESOURCE UPLOAD (FACULTY ONLY) */}
      {/* ======================================================== */}
      {showUploadModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="create-modal upload-resource-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <UploadCloud size={24} />
                <div>
                  <h2>Upload Academic Resource</h2>
                  <span>Faculty Verified Publisher Portal</span>
                </div>
              </div>

              <button
                className="icon-button"
                onClick={() => setShowUploadModal(false)}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleTeacherUpload}>
              <div className="form-group">
                <label>Subject</label>
                <select
                  value={newResourceSubject}
                  onChange={(e) => setNewResourceSubject(e.target.value)}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Resource Category</label>
                <select
                  value={newResourceType}
                  onChange={(e) => setNewResourceType(e.target.value)}
                >
                  <option value="Notes">Study Notes / Lecture Modules</option>
                  <option value="Question Paper">Previous Exam Question Paper</option>
                  <option value="Lab Manual">Lab Manual & Code Solutions</option>
                  <option value="Syllabus">VTU Syllabus & Scheme</option>
                </select>
              </div>

              <div className="form-group">
                <label>Resource Title</label>
                <input
                  placeholder="e.g. Module 3: Binary Trees & Graph Traversal Notes"
                  value={newResourceTitle}
                  onChange={(e) => setNewResourceTitle(e.target.value)}
                  required
                />
              </div>

              <div className="file-drop-zone">
                <FileText size={32} />
                <strong>Select File from Computer</strong>
                <small>Supports PDF, PPTX, DOCX (Max 25 MB)</small>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={(e) => setNewResourceFile(e.target.files?.[0])}
                  required
                />
                {newResourceFile && (
                  <span className="file-chosen-name">
                    📎 Selected: {newResourceFile.name}
                  </span>
                )}
              </div>

              <div className="faculty-verification-note">
                <Lock size={15} />
                <span>
                  This resource will be signed by <strong>{displayName}</strong> and published to the Student Vault.
                </span>
              </div>

              <button type="submit" className="primary-button full-width">
                Publish to Campus Vault
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: COURSE RESOURCES DRAWER (FOR STUDENTS TO VIEW & DOWNLOAD) */}
      {/* ======================================================== */}
      {showCourseDrawer && selectedCourse && (
        <div
          className="modal-overlay"
          onClick={() => setShowCourseDrawer(false)}
        >
          <div
            className="create-modal course-detail-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="drawer-code-tag">{selectedCourse.code}</span>
                <h2>{selectedCourse.title}</h2>
                <small>{selectedCourse.department} · {selectedCourse.semester}</small>
              </div>

              <button
                className="icon-button"
                onClick={() => setShowCourseDrawer(false)}
              >
                <X size={22} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-progress-box">
                <div className="progress-labels">
                  <span>Your Study Progress</span>
                  <strong>{selectedCourse.progress}%</strong>
                </div>
                <div className="course-progress-track">
                  <div
                    className="course-progress-fill"
                    style={{ width: `${selectedCourse.progress}%` }}
                  />
                </div>
              </div>

              <h3>Verified Subject Resources ({selectedCourse.resources.length})</h3>

              <div className="drawer-resource-list">
                {selectedCourse.resources.map((res) => (
                  <div key={res.id} className="drawer-resource-card">
                    <div className="res-icon-wrap">
                      <FileText size={22} />
                    </div>

                    <div className="res-text-wrap">
                      <strong>{res.title}</strong>
                      <p>
                        <span className="res-badge">{res.type}</span> · {res.size} · Uploaded by {res.uploadedBy}
                      </p>
                    </div>

                    <button
                      className="download-file-btn"
                      onClick={() =>
                        alert(`Starting download for: ${res.title}\nVerified by College Connect Faculty.`)
                      }
                    >
                      <Download size={16} />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CREATE POST MODAL (CAMPUS SOCIAL MOMENTS) */}
      {/* ======================================================== */}
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
              <h2>Create a Campus Post</h2>
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