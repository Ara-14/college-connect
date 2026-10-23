import { useState, useEffect, useRef, useCallback } from 'react'
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
  EyeOff,
  RefreshCw,
} from 'lucide-react'

import './App.css'
import CommunicationDashboard from './components/communication/CommunicationDashboard'
import CommunityChannels from './components/CommunityChannels'
import ThemeToggle from './components/ThemeToggle'
import './components/communication/communication.css'
import { api, getDefaultAvatar, getFullMediaUrl } from './services/api'
import { connectSocket, disconnectSocket, getSocket } from './services/socket'

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

const communities = [
  { id: 1, name: 'general', icon: Hash },
  { id: 2, name: 'announcements', icon: Bell },
  { id: 3, name: 'coding-club', icon: Hash },
  { id: 4, name: 'campus-events', icon: Hash },
  { id: 5, name: 'memes', icon: Smile },
]

function App() {
  const drawerRef = useRef(null)
  const menuToggleRef = useRef(null)
  const postsRequestRef = useRef(0)
  const postPreviewReaderRef = useRef(null)
  const avatarPreviewReaderRef = useRef(null)
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('cc_theme') === 'dark' ? 'dark' : 'light'
  )
  const [showTideIntro, setShowTideIntro] = useState(true)
  const [authUser, setAuthUser] = useState(() => {
    const saved = localStorage.getItem('cc_auth_user')
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return Boolean(localStorage.getItem('cc_auth_token') && localStorage.getItem('cc_auth_user'))
  })

  const [isRegistering, setIsRegistering] = useState(false)
  const [userRole, setUserRole] = useState(() => {
    const saved = localStorage.getItem('cc_auth_user')
    try {
      return saved ? JSON.parse(saved).role : 'STUDENT'
    } catch {
      return 'STUDENT'
    }
  })

  // Auth form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [college, setCollege] = useState('Visvesvaraya Technological University')
  const [department, setDepartment] = useState('Computer Science & Engineering')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [showQuickSwitchMenu, setShowQuickSwitchMenu] = useState(false)

  // Real in-app notifications
  const [realNotifications, setRealNotifications] = useState([])
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)

  // Demo accounts for instant two-way testing
  const demoAccounts = [
    { name: 'Aarav Sharma', role: 'STUDENT', email: 'aarav@vtu.edu', tag: 'Student (CSE 5th Sem)' },
    { name: 'Priya Reddy', role: 'STUDENT', email: 'priya@vtu.edu', tag: 'Student (CSE 5th Sem)' },
    { name: 'Prof. Ramesh Kulkarni', role: 'FACULTY', email: 'ramesh@vtu.edu', tag: 'HOD (Faculty)' },
    { name: 'Dr. Ananya Sharma', role: 'FACULTY', email: 'ananya@vtu.edu', tag: 'Assistant Prof' },
    { name: 'Prof. Sunitha Rao', role: 'FACULTY', email: 'sunitha@vtu.edu', tag: 'Faculty (DMs Restricted)' },
  ]

  // Socket & Notification Sync
  useEffect(() => {
    if (isLoggedIn && authUser) {
      connectSocket()
      fetchNotifs()
    }
  }, [isLoggedIn, authUser?.id])

  useEffect(() => {
    localStorage.setItem('cc_theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!isLoggedIn) return undefined

    let active = true
    api.getMe()
      .then(({ user }) => {
        if (!active || !user) return
        setAuthUser(user)
        setUserRole(user.role)
        localStorage.setItem('cc_auth_user', JSON.stringify(user))
      })
      .catch((error) => {
        if (!active) return
        if (error.status === 401) {
          localStorage.removeItem('cc_auth_token')
          localStorage.removeItem('cc_auth_user')
          disconnectSocket()
          setAuthUser(null)
          setIsLoggedIn(false)
          setAuthError('Your session has expired. Please log in again.')
          return
        }
        console.error('Could not verify the saved session:', error)
      })

    return () => {
      active = false
    }
  }, [isLoggedIn])

  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications()
      setRealNotifications(data.notifications || [])
      setUnreadNotifCount(data.unreadCount || 0)
    } catch (e) {
      // ignore
    }
  }

  // Navigation & Feed state
  const [activePage, setActivePage] = useState('messages')
  const [personalAIRequest, setPersonalAIRequest] = useState(null)
  const [feedMode, setFeedMode] = useState('learning')
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postError, setPostError] = useState('')
  const [postActionError, setPostActionError] = useState('')
  const [createPostError, setCreatePostError] = useState('')
  const [feedReloadKey, setFeedReloadKey] = useState(0)
  const [postSubmitting, setPostSubmitting] = useState(false)
  const [newImage, setNewImage] = useState(null)
  const [newImagePreview, setNewImagePreview] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState({})
  const [bioDraftState, setBioDraftState] = useState(() => ({
    userId: authUser?.id,
    value: authUser?.bio || '',
  }))
  const [bioSaving, setBioSaving] = useState(false)
  const [bioError, setBioError] = useState('')
  const [bioSaved, setBioSaved] = useState(false)

  // Academic Courses & Resources
  const [courses, setCourses] = useState([])
  const [coursesLoadError, setCoursesLoadError] = useState('')
  const [resourceUploading, setResourceUploading] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [showCourseDrawer, setShowCourseDrawer] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Teacher Upload Resource Form
  const [newResourceTitle, setNewResourceTitle] = useState('')
  const [newResourceSubject, setNewResourceSubject] = useState('')
  const [newResourceType, setNewResourceType] = useState('Notes')
  const [newResourceFile, setNewResourceFile] = useState(null)

  // Social & Posts state
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [newCaption, setNewCaption] = useState('')
  const [commentInputs, setCommentInputs] = useState({})
  const [following, setFollowing] = useState([])
  const [activeChat, setActiveChat] = useState(students[0])
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState({})
  const [activeChannel, setActiveChannel] = useState('general')

  const displayName = authUser?.fullName || fullName.trim() || (userRole === 'FACULTY' ? 'Prof. Ramesh' : 'Aarav Sharma')

  const myAvatar = getFullMediaUrl(authUser?.avatarUrl) || getDefaultAvatar(displayName, userRole)

  const bioDraft = bioDraftState.userId === authUser?.id
    ? bioDraftState.value
    : authUser?.bio || ''
  const setBioDraft = (value) => setBioDraftState({ userId: authUser?.id, value })

  const saveBio = async (event) => {
    event.preventDefault()
    setBioSaving(true)
    setBioError('')
    setBioSaved(false)
    try {
      const { user } = await api.updateProfile({ bio: bioDraft.trim() })
      const updatedUser = { ...authUser, ...user }
      setAuthUser(updatedUser)
      localStorage.setItem('cc_auth_user', JSON.stringify(updatedUser))
      setBioDraft(user.bio || '')
      setBioSaved(true)
    } catch (error) {
      setBioError(error.message || 'Could not save your bio.')
    } finally {
      setBioSaving(false)
    }
  }

  useEffect(() => {
    let active = true
    const requestId = ++postsRequestRef.current

    if (!isLoggedIn) {
      Promise.resolve().then(() => {
        if (active && requestId === postsRequestRef.current) {
          setPosts([])
          setPostsLoading(false)
          setPostError('')
        }
      })
      return () => {
        active = false
        postsRequestRef.current += 1
      }
    }

    Promise.resolve()
      .then(() => {
        if (!active || requestId !== postsRequestRef.current) return null
        setPostsLoading(true)
        setPostError('')
        return api.getPosts()
      })
      .then((data) => {
        if (!data) return
        if (!Array.isArray(data.posts)) {
          throw new Error('The server returned an invalid feed response.')
        }
        if (active && requestId === postsRequestRef.current) setPosts(data.posts)
      })
      .catch((error) => {
        if (active && requestId === postsRequestRef.current) {
          setPosts([])
          setPostError(error.message || 'Could not load posts. Please try again.')
        }
      })
      .finally(() => {
        if (active && requestId === postsRequestRef.current) setPostsLoading(false)
      })

    return () => {
      active = false
      postsRequestRef.current += 1
    }
  }, [isLoggedIn, authUser?.id, feedReloadKey])

  useEffect(() => {
    if (!isLoggedIn) {
      return undefined
    }
    let active = true
    api.getCourses()
      .then(({ courses: records }) => {
        if (!active) return
        const mappedCourses = (records || []).map((course, index) => ({
          id: course.id,
          title: course.name,
          code: course.code,
          department: course.department,
          semester: course.semester,
          description: '',
          icon: 'code',
          status: course.resources?.length ? 'Updated' : 'New',
          colorScheme: index % 2 ? 'mint' : 'sage',
          progress: 0,
          doodle: '',
          resources: (course.resources || []).map((resource) => ({
            id: resource.id,
            title: resource.title,
            type: resource.category,
            format: resource.fileFormat,
            size: resource.fileSize || '',
            uploadedBy: resource.uploader?.fullName || 'Faculty',
            date: new Date(resource.createdAt).toLocaleDateString(),
            fileUrl: resource.fileUrl,
          })),
        }))
        setCourses(mappedCourses)
        setNewResourceSubject((current) =>
          mappedCourses.some((course) => course.id === current) ? current : mappedCourses[0]?.id || ''
        )
        setCoursesLoadError('')
      })
      .catch((error) => {
        if (active) {
          console.error('Failed to load academic courses:', error)
          setCourses([])
          setCoursesLoadError(error.message || 'Academic resources could not be loaded.')
        }
      })
    return () => {
      active = false
    }
  }, [isLoggedIn, authUser?.id])

  useEffect(() => {
    if (!mobileMenuOpen) return undefined

    const menuToggle = menuToggleRef.current
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileMenuOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        return
      }

      if (event.key !== 'Tab') return
      const focusableElements = drawerRef.current?.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusableElements?.length) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    drawerRef.current?.querySelector('.mobile-drawer-close')?.focus()
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
      menuToggle?.focus()
    }
  }, [mobileMenuOpen])

  const navigation = [
    { id: 'messages', label: 'Communication Hub', icon: MessageCircle },
    { id: 'home', label: 'Home Feed', icon: Home },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'vault', label: 'Academic Vault', icon: Sparkles },
    { id: 'communities', label: 'Communities', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const navigate = (page) => {
    setActivePage(page)
    if (page !== 'messages') setPersonalAIRequest(null)
    setMobileMenuOpen(false)
  }

  const handleAskPersonalAI = (prompt) => {
    setPersonalAIRequest((current) => ({ id: (current?.id || 0) + 1, prompt }))
    setActivePage('messages')
    setMobileMenuOpen(false)
  }

  const handlePersonalAIRequestHandled = useCallback(() => {
    setPersonalAIRequest(null)
  }, [])

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match!')
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters!')
        }
        const res = await api.register({
          email: email.trim(),
          username: email.split('@')[0],
          fullName: fullName.trim() || (userRole === 'FACULTY' ? 'Prof. Faculty' : 'Student User'),
          password,
          role: userRole,
          department: department.trim(),
          college: college.trim(),
        })
        localStorage.setItem('cc_auth_token', res.token)
        localStorage.setItem('cc_auth_user', JSON.stringify(res.user))
        setAuthUser(res.user)
        setUserRole(res.user.role)
        setIsLoggedIn(true)
        setActivePage('messages')
      } else {
        const res = await api.login(email.trim(), password)
        localStorage.setItem('cc_auth_token', res.token)
        localStorage.setItem('cc_auth_user', JSON.stringify(res.user))
        setAuthUser(res.user)
        setUserRole(res.user.role)
        setIsLoggedIn(true)
        setActivePage('messages')
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed. Please check credentials.')
    } finally {
      setAuthLoading(false)
    }
  }

  const quickLoginAs = async (emailToUse) => {
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await api.login(emailToUse, 'college123')
      localStorage.setItem('cc_auth_token', res.token)
      localStorage.setItem('cc_auth_user', JSON.stringify(res.user))
      setAuthUser(res.user)
      setUserRole(res.user.role)
      setIsLoggedIn(true)
      setActivePage('messages')
      connectSocket()
      setShowQuickSwitchMenu(false)
    } catch (err) {
      setAuthError(err.message || 'Quick login failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('cc_auth_token')
    localStorage.removeItem('cc_auth_user')
    disconnectSocket()
    setAuthUser(null)
    setIsLoggedIn(false)
    setShowQuickSwitchMenu(false)
    setMobileMenuOpen(false)
  }

  const handleMarkAllNotifsRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setRealNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadNotifCount(0)
    } catch (e) {
      console.error(e)
    }
  }

  const handleTeacherUpload = async (e) => {
    e.preventDefault()

    if (!newResourceTitle.trim() || !newResourceSubject || !newResourceFile) {
      alert('Choose a subject, enter a title, and select a resource file.')
      return
    }

    setResourceUploading(true)
    try {
      const { resource } = await api.uploadAcademicResource({
        title: newResourceTitle.trim(),
        category: newResourceType,
        subjectId: newResourceSubject,
      }, newResourceFile)
      if (!resource?.id) throw new Error('The server did not confirm the resource upload.')
      const savedResource = {
        id: resource.id,
        title: resource.title,
        type: resource.category,
        format: resource.fileFormat,
        size: resource.fileSize || '',
        uploadedBy: resource.uploader?.fullName || displayName,
        date: new Date(resource.createdAt).toLocaleDateString(),
        fileUrl: resource.fileUrl,
      }
      setCourses((prevCourses) => prevCourses.map((course) =>
        course.id === newResourceSubject
          ? { ...course, resources: [savedResource, ...course.resources] }
          : course
      ))
      setNewResourceTitle('')
      setNewResourceFile(null)
      setShowUploadModal(false)
      alert(`Resource uploaded successfully to the ${newResourceType} vault.`)
    } catch (error) {
      alert(`Resource upload failed: ${error.message}`)
    } finally {
      setResourceUploading(false)
    }
  }

  const toggleLike = async (id) => {
    setPostActionError('')
    try {
      const result = await api.toggleLike(id)
      setPosts((current) => current.map((post) => (
        post.id === id
          ? { ...post, liked: result.liked, likes: result.likesCount }
          : post
      )))
    } catch (error) {
      setPostActionError(error.message || 'Could not update the like. Please try again.')
    }
  }

  const toggleSave = async (id) => {
    setPostActionError('')
    try {
      const result = await api.toggleSave(id)
      setPosts((current) => current.map((post) => (
        post.id === id ? { ...post, saved: result.saved } : post
      )))
    } catch (error) {
      setPostActionError(error.message || 'Could not save the post. Please try again.')
    }
  }

  const addComment = async (id) => {
    const text = (commentInputs[id] || '').trim()
    if (!text || commentSubmitting[id]) return

    setPostActionError('')
    setCommentSubmitting((current) => ({ ...current, [id]: true }))
    try {
      const result = await api.addComment(id, text)
      if (!result.comment) throw new Error('The server did not confirm the comment.')
      setPosts((current) => current.map((post) => (
        post.id === id
          ? { ...post, comments: [...post.comments, result.comment] }
          : post
      )))
      setCommentInputs((current) => ({ ...current, [id]: '' }))
    } catch (error) {
      setPostActionError(error.message || 'Could not add your comment. Please try again.')
    } finally {
      setCommentSubmitting((current) => ({ ...current, [id]: false }))
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCreatePostError('Choose a JPG, JPEG, PNG, or WebP image.')
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setCreatePostError('Images must be 5 MB or smaller.')
      e.target.value = ''
      return
    }

    setCreatePostError('')
    setNewImage(file)
    postPreviewReaderRef.current?.abort()
    const reader = new FileReader()
    postPreviewReaderRef.current = reader
    reader.onload = () => {
      if (postPreviewReaderRef.current === reader) setNewImagePreview(String(reader.result))
    }
    reader.onerror = () => {
      if (postPreviewReaderRef.current === reader) setCreatePostError('Could not preview the selected image.')
    }
    reader.readAsDataURL(file)
  }

  const createPost = async (e) => {
    e.preventDefault()

    if (!newCaption.trim() && !newImage) {
      setCreatePostError('Add a caption or select an image to create a post.')
      return
    }

    const formData = new FormData()
    formData.append('caption', newCaption.trim())
    formData.append('location', college.trim())
    if (newImage) formData.append('image', newImage)

    setPostSubmitting(true)
    setCreatePostError('')
    try {
      const result = await api.createPost(formData)
      if (!result.post?.id) throw new Error('The server did not confirm that the post was created.')

      postsRequestRef.current += 1
      setPosts((current) => [result.post, ...current]
        .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt)))
      setNewCaption('')
      setNewImage(null)
      setNewImagePreview('')
      postPreviewReaderRef.current?.abort()
      postPreviewReaderRef.current = null
      setShowCreatePost(false)
      setFeedMode('social')
      setActivePage('home')
      setMobileMenuOpen(false)
    } catch (error) {
      setCreatePostError(error.message || 'Could not create your post. Please try again.')
    } finally {
      setPostSubmitting(false)
    }
  }

  const handleAvatarSelection = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Choose a JPG, JPEG, PNG, or WebP image.')
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Profile pictures must be 5 MB or smaller.')
      e.target.value = ''
      return
    }

    setAvatarError('')
    setSelectedAvatar(file)
    avatarPreviewReaderRef.current?.abort()
    const reader = new FileReader()
    avatarPreviewReaderRef.current = reader
    reader.onload = () => {
      if (avatarPreviewReaderRef.current === reader) setAvatarPreview(String(reader.result))
    }
    reader.onerror = () => {
      if (avatarPreviewReaderRef.current === reader) setAvatarError('Could not preview the selected image.')
    }
    reader.readAsDataURL(file)
  }

  const saveAvatar = async () => {
    if (!selectedAvatar || !avatarPreview || avatarUploading) return

    setAvatarUploading(true)
    setAvatarError('')
    try {
      const result = await api.uploadAvatar(selectedAvatar)
      if (!result.user?.avatarUrl) {
        throw new Error('The server did not confirm the profile picture update.')
      }

      const updatedUser = { ...authUser, ...result.user }
      setAuthUser(updatedUser)
      localStorage.setItem('cc_auth_user', JSON.stringify(updatedUser))
      setPosts((current) => current.map((post) => ({
        ...post,
        ...(post.userId === updatedUser.id ? { avatar: updatedUser.avatarUrl } : {}),
        comments: post.comments.map((comment) => (
          comment.userId === updatedUser.id
            ? { ...comment, avatar: updatedUser.avatarUrl }
            : comment
        )),
      })))
      setSelectedAvatar(null)
      setAvatarPreview('')
      avatarPreviewReaderRef.current?.abort()
      avatarPreviewReaderRef.current = null
    } catch (error) {
      setAvatarError(error.message || 'Could not update your profile picture. Please try again.')
    } finally {
      setAvatarUploading(false)
    }
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
      <div className="login-page" data-theme={theme}>
        <div className="login-atmosphere" aria-hidden="true">
          <span className="login-bubble login-bubble-one" />
          <span className="login-bubble login-bubble-two" />
          <span className="login-bubble login-bubble-three" />
          <span className="login-bubble login-bubble-four" />
          <span className="login-bubble login-bubble-five" />
          <span className="login-bubble login-bubble-six" />
          <span className="login-bubble login-bubble-seven" />
          <span className="login-glint login-glint-one" />
          <span className="login-glint login-glint-two" />
          <span className="login-glint login-glint-three" />
          <span className="login-glint login-glint-four" />
          <span className="login-glint login-glint-five" />
        </div>
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
            src="/cc-logo.png"
            alt="College Connect C.C logo"
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
              : `Welcome Back, ${userRole === 'FACULTY' ? 'Professor!' : 'Pal!'}`}
          </h2>

          {/* DEMO QUICK LOGIN SWITCHER */}
          <div className="demo-accounts-box">
            <span className="demo-accounts-title">⚡ Instant Demo Login (Click to Test):</span>
            <div className="demo-accounts-grid">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  className="demo-account-chip"
                  onClick={() => quickLoginAs(acc.email)}
                  disabled={authLoading}
                >
                  <strong>{acc.name}</strong>
                  <small>{acc.tag}</small>
                </button>
              ))}
            </div>
          </div>

          {authError && <div className="cc-error-box cc-mb-2">{authError}</div>}

          <form onSubmit={handleAuth}>
            {isRegistering && (
              <>
                <input
                  placeholder={userRole === 'FACULTY' ? 'Full Name (e.g. Prof. Ramesh)' : 'Full Name (e.g. Aarav Sharma)'}
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
              placeholder={userRole === 'FACULTY' ? 'Faculty Email (e.g. ramesh@vtu.edu)' : 'College Student Email (e.g. aarav@vtu.edu)'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="login-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (Default: college123)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-visibility-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {isRegistering && (
              <div className="login-password-field">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-visibility-toggle"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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

            <button type="submit" className="login-submit-btn" disabled={authLoading}>
              {authLoading
                ? 'Connecting...'
                : isRegistering
                ? 'Create Account'
                : `Log In as ${userRole === 'FACULTY' ? 'Faculty' : 'Student'}`}
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
                setAuthError('')
              }}
            >
              {isRegistering ? 'Log In' : 'Register'}
            </a>
          </p>
        </div>

        {showTideIntro && (
          <div
            className="login-tide-intro"
            aria-hidden="true"
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) setShowTideIntro(false)
            }}
          >
            <svg className="tide-water" viewBox="0 0 1440 900" preserveAspectRatio="none">
              <defs>
                <linearGradient id="tide-water-gradient" x1="0" y1="0" x2="0.6" y2="1">
                  <stop offset="0%" stopColor="#55cf7d" />
                  <stop offset="55%" stopColor="#18a45b" />
                  <stop offset="100%" stopColor="#107744" />
                </linearGradient>
              </defs>
              <path
                className="tide-wave-shadow"
                d="M0 900V520c117-24 177-107 239-230C315 139 430 128 508 217c79 91 77 223 177 303 174 140 422-79 755-2v382H0Z"
              />
              <path
                className="tide-wave-body"
                d="M0 900V555c117-24 177-107 239-230C315 174 430 163 508 252c79 91 77 223 177 303 174 140 422-79 755-2v347H0Z"
              />
              <path
                className="tide-wave-curl"
                d="M294 342c47-97 127-127 196-63 47 44 63 119 91 181-46-42-58-97-99-134-53-49-108-29-146 30-42 65-66 138-156 190 55-56 81-131 114-204Z"
              />
              <path
                className="tide-wave-foam"
                d="M0 526c109-25 163-107 221-220 62-122 170-174 263-106 50 37 74 100 94 164-37-55-56-117-102-149-69-48-145-2-194 89C221 432 165 523 0 562Z"
              />
              <path
                className="tide-wave-detail"
                d="M26 538c102-29 152-112 207-220m-112 239c88-44 121-112 164-195m-8-26c48-71 108-85 154-46 29 25 44 64 57 101"
              />
              <path
                className="tide-wave-ripples"
                d="M74 590c96-15 172-73 235-166m-167 188c115-21 185-81 249-172m-176 195c111-9 192-58 271-146m72 126c161 38 321 1 489-66m-397 104c174 28 324-8 480-71"
              />
              <path
                className="tide-wave-scroll"
                d="M345 331c29-60 79-88 126-60 28 17 39 53 49 86-24-35-42-58-65-59-37-1-55 42-34 67 16 19 43 14 48-6 4-14-8-27-21-22"
              />
              <path
                className="tide-wave-spray"
                d="M452 181c12-25 27-44 46-54m-25 79c19-34 40-57 67-69m-28 101c19-24 36-40 58-47"
              />
              <circle className="tide-bubble tide-bubble-one" cx="560" cy="540" r="11" />
              <circle className="tide-bubble tide-bubble-two" cx="630" cy="580" r="7" />
              <circle className="tide-bubble tide-bubble-three" cx="500" cy="492" r="6" />
            </svg>
            <span className="tide-splash tide-splash-one" />
            <span className="tide-splash tide-splash-two" />
            <span className="tide-splash tide-splash-three" />
            <span className="tide-splash tide-splash-four" />
            <img className="tide-brand" src="/cc-logo.png" alt="" />
          </div>
        )}
      </div>
    )
  }

  // ==========================================
  // MAIN APPLICATION DASHBOARD
  // ==========================================
  return (
    <div className="app-layout" data-theme={theme}>
      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-drawer-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* LEFT NAVIGATION SIDEBAR */}
      <aside
        id="mobile-navigation"
        className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}
        ref={drawerRef}
        role={mobileMenuOpen ? 'dialog' : undefined}
        aria-modal={mobileMenuOpen || undefined}
        aria-label="Main navigation"
      >
        <button
          type="button"
          className="mobile-drawer-close"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X size={22} />
        </button>

        <div className="brand" onClick={() => navigate('home')}>
          <img src="/cc-logo.png" alt="College Connect logo" />
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

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${activePage === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
              aria-current={activePage === id ? 'page' : undefined}
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
            aria-label="Log out"
            onClick={handleLogout}
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
              ref={menuToggleRef}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
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
            {/* Quick Demo Switcher for Pair Testing */}
            <div className="profile-switcher-wrapper">
              <button
                type="button"
                className="profile-switcher-btn"
                onClick={() => setShowQuickSwitchMenu(!showQuickSwitchMenu)}
                title="Switch User Role to test real-time communication"
              >
                <RefreshCw size={13} className="text-emerald-400" />
                <span className="role-user-name">{displayName}</span>
                <span className={`cc-role-badge ${authUser?.role === 'FACULTY' ? 'badge-faculty' : 'badge-student'}`}>
                  {authUser?.role === 'FACULTY' ? 'Faculty' : 'Student'}
                </span>
              </button>

              {showQuickSwitchMenu && (
                <div className="quick-switch-dropdown">
                  <div className="dropdown-header">Switch User / Test Roles:</div>
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      className={`switch-item ${authUser?.email === acc.email ? 'current' : ''}`}
                      onClick={() => quickLoginAs(acc.email)}
                    >
                      <span className="switch-name">{acc.name}</span>
                      <small className="switch-tag">{acc.tag}</small>
                    </button>
                  ))}
                  <div className="dropdown-divider" />
                  <button type="button" className="switch-item logout" onClick={handleLogout}>
                    <LogOut size={14} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>

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
                onClick={() => {
                  setFeedMode(feedMode === 'learning' ? 'social' : 'learning')
                  navigate('home')
                }}
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
              {unreadNotifCount > 0 && (
                <span className="bell-red-badge">{unreadNotifCount}</span>
              )}
            </button>
          </div>
        </header>

        {/* FEED / CONTENT CONTAINER */}
        <div className={`dashboard-content ${activePage === 'messages' ? 'communication-page' : ''}`}>
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
                          disabled={!courses.length}
                          onClick={() => {
                            if (courses[0]) {
                              setSelectedCourse(courses[0])
                              setShowCourseDrawer(true)
                            }
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
                        <div className="chip-icon-box green-chip">
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
                      {coursesLoadError && <p className="academic-load-error" role="alert">{coursesLoadError}</p>}
                      {!courses.length && !coursesLoadError && (
                        <p className="academic-empty-state">No courses or uploaded resources are available yet.</p>
                      )}
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

                    {postActionError && (
                      <p className="feed-error" role="alert">{postActionError}</p>
                    )}

                    {postsLoading ? (
                      <div className="feed-loading" role="status">Loading posts...</div>
                    ) : postError ? (
                      <div className="feed-error" role="alert">
                        <p>{postError}</p>
                        <button type="button" onClick={() => setFeedReloadKey((key) => key + 1)}>
                          Try again
                        </button>
                      </div>
                    ) : posts.length === 0 ? (
                      <div className="feed-empty-state">
                        <Camera size={36} />
                        <p>No campus posts yet. Be the first to share a moment.</p>
                      </div>
                    ) : (
                      posts.map((post) => (
                        <article className="post-card" key={post.id}>
                          <div className="post-header">
                            <img
                              src={getFullMediaUrl(post.avatar) || getDefaultAvatar(post.user, post.userRole)}
                              alt={`${post.user}'s profile`}
                              className="avatar"
                            />

                            <div className="post-author">
                              <strong>{post.user}</strong>
                              <small>@{post.username}</small>
                              <span>
                                {post.location} ·{' '}
                                <time dateTime={post.createdAt}>
                                  {post.createdAt ? new Date(post.createdAt).toLocaleString() : post.time}
                                </time>
                              </span>
                            </div>

                            <MoreHorizontal size={21} aria-hidden="true" />
                          </div>

                          {post.image && (
                            <img
                              src={getFullMediaUrl(post.image)}
                              alt={`Photo shared by ${post.user}`}
                              className="post-image"
                            />
                          )}

                          <div className="post-actions">
                            <div className="post-actions-left">
                              <button
                                type="button"
                                className={post.liked ? 'icon-button liked' : 'icon-button'}
                                onClick={() => toggleLike(post.id)}
                                aria-label={post.liked ? 'Unlike post' : 'Like post'}
                                aria-pressed={post.liked}
                              >
                                <Heart size={24} fill={post.liked ? 'currentColor' : 'none'} />
                              </button>

                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => document.getElementById(`comment-${post.id}`)?.focus()}
                                aria-label="Write a comment"
                              >
                                <MessageCircle size={24} />
                              </button>

                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => {
                                  if (navigator.share) {
                                    navigator.share({
                                      title: 'College Connect',
                                      text: post.caption,
                                    }).catch(() => {})
                                  } else {
                                    alert('Sharing is not supported in this browser.')
                                  }
                                }}
                                aria-label="Share post"
                              >
                                <Send size={22} />
                              </button>
                            </div>

                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => toggleSave(post.id)}
                              aria-label={post.saved ? 'Unsave post' : 'Save post'}
                              aria-pressed={post.saved}
                            >
                              <Bookmark
                                size={22}
                                fill={post.saved ? 'currentColor' : 'none'}
                              />
                            </button>
                          </div>

                          <div className="post-details">
                            <strong>{Number(post.likes || 0).toLocaleString()} likes</strong>
                            {post.caption && (
                              <p>
                                <strong>@{post.username}</strong> {post.caption}
                              </p>
                            )}
                            <span className="comment-count">
                              {post.comments.length} comments
                            </span>

                            {post.comments.map((comment) => (
                              <div className="comment-line" key={comment.id}>
                                <img
                                  src={getFullMediaUrl(comment.avatar) || getDefaultAvatar(comment.user, comment.userRole)}
                                  alt=""
                                  className="comment-avatar"
                                />
                                <p><strong>{comment.user}</strong> {comment.text}</p>
                              </div>
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
                            <button type="submit" disabled={!commentInputs[post.id]?.trim() || commentSubmitting[post.id]}>
                              {commentSubmitting[post.id] ? 'Posting...' : 'Post'}
                            </button>
                          </form>
                        </article>
                      ))
                    )}
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

                            <a
                              className="download-pill-btn"
                              href={getFullMediaUrl(res.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => api.recordResourceDownload(res.id).catch((error) => {
                                console.error('Could not record resource download:', error)
                              })}
                            >
                              <Download size={14} />
                              <span>Download</span>
                            </a>
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

            {/* COMMUNICATION MODULE (FULL SUITE) */}
            {activePage === 'messages' && (
              <CommunicationDashboard
                currentUser={
                  authUser || {
                    id: 'guest',
                    fullName: displayName,
                    role: userRole,
                    department: department,
                    avatarUrl: myAvatar,
                    allowStudentDMs: true,
                  }
                }
                onProfileUpdated={(updated) => {
                  setAuthUser(updated)
                  localStorage.setItem('cc_auth_user', JSON.stringify(updated))
                }}
                personalAIRequest={personalAIRequest}
                onAskPersonalAI={handleAskPersonalAI}
                onPersonalAIRequestHandled={handlePersonalAIRequestHandled}
              />
            )}

            {/* NOTIFICATIONS TAB */}
            {activePage === 'notifications' && (
              <div className="page-panel">
                <div className="vault-header-row">
                  <div>
                    <h2>Notifications & Bulletins 🔔</h2>
                    <p>Real-time updates on college messages, announcements, and academic updates.</p>
                  </div>
                  {unreadNotifCount > 0 && (
                    <button
                      className="primary-button"
                      onClick={handleMarkAllNotifsRead}
                    >
                      <Check size={16} />
                      <span>Mark all as read</span>
                    </button>
                  )}
                </div>

                {realNotifications.length === 0 ? (
                  <div className="cc-empty-state">
                    <Bell size={44} className="text-emerald-400" />
                    <h3>No new notifications</h3>
                    <p>You are all caught up on announcements, deadlines, and messages!</p>
                  </div>
                ) : (
                  <div className="notifications-list-container">
                    {realNotifications.map((note) => (
                      <div
                        className={`notification-item ${!note.isRead ? 'unread-notif' : ''}`}
                        key={note.id}
                        onClick={async () => {
                          if (!note.isRead) {
                            await api.markNotificationRead(note.id)
                            setRealNotifications((prev) =>
                              prev.map((n) => (n.id === note.id ? { ...n, isRead: true } : n))
                            )
                            setUnreadNotifCount((prev) => Math.max(0, prev - 1))
                          }
                          if (note.entityId) {
                            navigate('messages')
                          }
                        }}
                      >
                        <div className="notification-icon">
                          <Bell size={18} />
                        </div>
                        <div className="notif-text-box">
                          <div className="cc-flex-between">
                            <strong>{note.title || 'Campus Notification'}</strong>
                            <small className="cc-text-muted">
                              {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </small>
                          </div>
                          <p>{note.message}</p>
                        </div>
                        {!note.isRead && <span className="notif-unread-dot" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COMMUNITIES TAB */}
            {activePage === 'communities' && (
              <CommunityChannels
                currentUser={authUser}
                selectedChannel={activeChannel}
                onSelectChannel={setActiveChannel}
                onAskPersonalAI={handleAskPersonalAI}
              />
            )}

            {/* PROFILE TAB */}
            {activePage === 'profile' && (
              <div className="page-panel">
                <div className="profile-header">
                  <div className="profile-avatar-editor">
                    <img src={avatarPreview || myAvatar} alt={`${displayName}'s profile`} />
                    <label className="avatar-change-button">
                      <Camera size={16} />
                      <span>Change picture</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={handleAvatarSelection}
                        onClick={(event) => {
                          event.currentTarget.value = ''
                        }}
                        disabled={avatarUploading}
                      />
                    </label>
                  </div>

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

                {avatarError && <p className="profile-avatar-error" role="alert">{avatarError}</p>}
                <form className="profile-bio-editor" onSubmit={saveBio}>
                  <label htmlFor="profile-bio">About you</label>
                  <textarea
                    id="profile-bio"
                    value={bioDraft}
                    onChange={(event) => {
                      setBioDraft(event.target.value)
                      setBioSaved(false)
                    }}
                    maxLength={500}
                    rows={3}
                    placeholder="Share a little about yourself..."
                  />
                  <div className="profile-bio-actions">
                    <small>{bioDraft.length}/500</small>
                    <button type="submit" className="primary-button" disabled={bioSaving}>
                      {bioSaving ? 'Saving...' : 'Save bio'}
                    </button>
                  </div>
                  {bioError && <p className="profile-avatar-error" role="alert">{bioError}</p>}
                  {bioSaved && <p className="profile-bio-saved" role="status">Bio saved.</p>}
                </form>
                {selectedAvatar && (
                  <div className="avatar-save-actions">
                    <span>Preview your new profile picture before saving.</span>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={saveAvatar}
                      disabled={avatarUploading || !avatarPreview}
                    >
                      {avatarUploading ? 'Saving...' : 'Save picture'}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setSelectedAvatar(null)
                        setAvatarError('')
                        setAvatarPreview('')
                        avatarPreviewReaderRef.current?.abort()
                        avatarPreviewReaderRef.current = null
                      }}
                      disabled={avatarUploading}
                    >
                      Cancel
                    </button>
                  </div>
                )}

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
                <div className="settings-item theme-setting-item">
                  <div className="theme-setting-copy">
                    <strong>Appearance</strong>
                    <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
                  </div>
                  <ThemeToggle
                    theme={theme}
                    onToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
                  />
                </div>
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
                onClick={handleLogout}
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
                  required
                  disabled={!courses.length}
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

              <button type="submit" className="primary-button full-width" disabled={resourceUploading || !courses.length}>
                {resourceUploading ? 'Uploading...' : 'Publish to Campus Vault'}
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

                    <a
                      className="download-file-btn"
                      href={getFullMediaUrl(res.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => api.recordResourceDownload(res.id).catch((error) => {
                        console.error('Could not record resource download:', error)
                      })}
                    >
                      <Download size={16} />
                      <span>Download</span>
                    </a>
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

              {newImagePreview && (
                <img
                  src={newImagePreview}
                  alt="Upload preview"
                  className="upload-preview"
                />
              )}

              {createPostError && <p className="profile-avatar-error" role="alert">{createPostError}</p>}

              <label className="upload-label">
                <ImageIcon size={21} />
                {newImage ? 'Change Photo' : 'Add Photo'}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  onClick={(event) => {
                    event.currentTarget.value = ''
                  }}
                  hidden
                  disabled={postSubmitting}
                />
              </label>

              <button type="submit" className="primary-button" disabled={postSubmitting}>
                {postSubmitting ? 'Sharing...' : 'Share Post'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App