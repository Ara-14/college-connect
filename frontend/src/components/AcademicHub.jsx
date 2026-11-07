import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Medal,
  Plus,
  RefreshCw,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'
import { api } from '../services/api'
import './AcademicHub.css'

const semesters = ['1st Sem', '2nd Sem', '3rd Sem', '4th Sem', '5th Sem', '6th Sem', '7th Sem', '8th Sem']
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function AcademicHub({ currentUser }) {
  const isFaculty = currentUser?.role === 'FACULTY' || currentUser?.role === 'ADMIN'
  const [activeTab, setActiveTab] = useState('attendance')
  const [semester, setSemester] = useState(currentUser?.semester || '5th Sem')
  const [dashboard, setDashboard] = useState(null)
  const [quizzes, setQuizzes] = useState([])
  const [students, setStudents] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [answers, setAnswers] = useState([])
  const [quizResult, setQuizResult] = useState(null)
  const [presentStudents, setPresentStudents] = useState({})
  const [attendanceForm, setAttendanceForm] = useState({ subject: 'Unix System Programming', classDate: today(), period: '1' })
  const [timetableForm, setTimetableForm] = useState({ subject: '', dayOfWeek: '1', startTime: '09:00', endTime: '10:00', room: '' })
  const [resultForm, setResultForm] = useState({ studentId: '', subject: '', examType: 'Internal Assessment 1', score: '', maxScore: '50' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const reloadDashboard = useCallback(async () => {
    const data = await api.getLearningDashboard(semester)
    setDashboard(data)
  }, [semester])

  useEffect(() => {
    let active = true
    api.getLearningDashboard(semester)
      .then((data) => {
        if (!active) return
        setDashboard(data)
        setLoading(false)
      })
      .catch((loadError) => {
        if (!active) return
        setError(loadError.message || 'Could not load academic information.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [semester])

  useEffect(() => {
    let active = true
    api.getUnixQuizzes()
      .then(({ quizzes: quizList }) => {
        if (active) setQuizzes(quizList)
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Could not load Unix quizzes.')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!isFaculty) return
    let active = true
    api.getClassStudents(semester)
      .then(({ students: classStudents }) => {
        if (!active) return
        setStudents(classStudents)
        setPresentStudents(Object.fromEntries(classStudents.map((student) => [student.id, true])))
        setResultForm((current) => ({ ...current, studentId: current.studentId || classStudents[0]?.id || '' }))
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Could not load the class roster.')
      })
    return () => {
      active = false
    }
  }, [isFaculty, semester])

  const attendanceTotals = useMemo(() => {
    const subjects = dashboard?.attendance || []
    return subjects.reduce((totals, subject) => ({
      attended: totals.attended + subject.attended,
      total: totals.total + subject.total,
    }), { attended: 0, total: 0 })
  }, [dashboard])

  const attendancePercent = attendanceTotals.total
    ? Math.round((attendanceTotals.attended / attendanceTotals.total) * 100)
    : 0

  const runAction = async (action, successMessage) => {
    setError('')
    setNotice('')
    setSaving(true)
    try {
      await action()
      await reloadDashboard()
      setNotice(successMessage)
    } catch (actionError) {
      setError(actionError.message || 'The academic update could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const handleAttendanceSubmit = (event) => {
    event.preventDefault()
    runAction(
      () => api.recordClassAttendance({
        ...attendanceForm,
        semester,
        period: Number(attendanceForm.period),
        marks: students.map((student) => ({ studentId: student.id, attended: Boolean(presentStudents[student.id]) })),
      }),
      'Class attendance recorded for the selected students.'
    )
  }

  const handleTimetableSubmit = (event) => {
    event.preventDefault()
    runAction(
      () => api.addTimetableEntry({ ...timetableForm, semester, dayOfWeek: Number(timetableForm.dayOfWeek) }),
      'Timetable class added.'
    )
  }

  const handleTimetableDelete = (entry) => {
    if (!window.confirm(`Remove ${entry.subject} from the timetable?`)) return
    runAction(
      () => api.deleteTimetableEntry(entry.id),
      'Timetable class removed.'
    )
  }

  const handleResultSubmit = (event) => {
    event.preventDefault()
    runAction(
      () => api.publishStudentResult({
        ...resultForm,
        semester,
        score: Number(resultForm.score),
        maxScore: Number(resultForm.maxScore),
      }),
      'Student result published.'
    )
  }

  const submitQuiz = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)
    try {
      const { attempt } = await api.submitUnixQuiz(selectedQuiz.id, answers, semester)
      setQuizResult(attempt)
      await reloadDashboard()
    } catch (submitError) {
      setError(submitError.message || 'The quiz could not be submitted.')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
    { id: 'quizzes', label: 'Online quizzes', icon: BookOpen },
    { id: 'timetable', label: 'Timetable', icon: CalendarDays },
    { id: 'results', label: 'Results', icon: GraduationCap },
    { id: 'rankings', label: 'Rankings', icon: Trophy },
  ]

  if (loading) {
    return <div className="academic-loading"><RefreshCw size={18} className="academic-spin" /> Loading Academic Hub…</div>
  }

  return (
    <section className="academic-hub">
      <header className="academic-hero">
        <div className="academic-hero-icon"><GraduationCap size={25} /></div>
        <div>
          <p className="academic-eyebrow">STUDENT SUCCESS • {semester.toUpperCase()}</p>
          <h1>Academic Hub</h1>
          <p>Attendance, Unix programming practice, class timetable and results in one place.</p>
        </div>
        <div className="academic-semester-control">
          <label htmlFor="academic-semester">Semester</label>
          <select id="academic-semester" value={semester} onChange={(event) => {
            setLoading(true)
            setSemester(event.target.value)
          }}>
            {semesters.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </header>

      {error && <div className="academic-alert academic-alert-error" role="alert">{error}</div>}
      {notice && <div className="academic-alert academic-alert-success" role="status">{notice}</div>}

      <div className="academic-summary-grid">
        <article className="academic-summary-card attendance-summary">
          <span className="academic-summary-icon"><CheckCircle2 size={19} /></span>
          <span className="academic-summary-label">{isFaculty ? 'Class roster' : 'Attendance'}</span>
          <strong>{isFaculty ? students.length : `${attendancePercent}%`}</strong>
          <small>{isFaculty ? `students in ${semester}` : `${attendanceTotals.attended} of ${attendanceTotals.total} classes attended`}</small>
        </article>
        <article className="academic-summary-card">
          <span className="academic-summary-icon"><BookOpen size={19} /></span>
          <span className="academic-summary-label">Unix modules</span>
          <strong>{quizzes.length}</strong>
          <small>Short quizzes across the syllabus</small>
        </article>
        <article className="academic-summary-card">
          <span className="academic-summary-icon"><CalendarDays size={19} /></span>
          <span className="academic-summary-label">Classes this week</span>
          <strong>{dashboard?.timetable?.length || 0}</strong>
          <small>Timetable entries for {semester}</small>
        </article>
      </div>

      <nav className="academic-tabs" aria-label="Academic sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={activeTab === id ? 'active' : ''} onClick={() => {
            setActiveTab(id)
            setError('')
            setNotice('')
          }}>
            <Icon size={17} />{label}
          </button>
        ))}
      </nav>

      {activeTab === 'attendance' && (
        <div className="academic-section">
          <div className="academic-section-heading">
            <div><h2>Semester attendance</h2><p>Class-by-class attendance records for {semester}.</p></div>
            <span className={`academic-attendance-badge ${attendancePercent < 75 ? 'below-target' : ''}`}>{attendancePercent}% attendance</span>
          </div>
          {isFaculty && (
            <form className="academic-form-card" onSubmit={handleAttendanceSubmit}>
              <div className="academic-form-heading"><Users size={19} /><div><h3>Record a class</h3><p>Attendance is recorded for the selected class roster.</p></div></div>
              <div className="academic-form-grid">
                <label>Subject<input required maxLength="120" value={attendanceForm.subject} onChange={(event) => setAttendanceForm({ ...attendanceForm, subject: event.target.value })} /></label>
                <label>Date<input required type="date" value={attendanceForm.classDate} onChange={(event) => setAttendanceForm({ ...attendanceForm, classDate: event.target.value })} /></label>
                <label>Class period<input required type="number" min="1" max="16" value={attendanceForm.period} onChange={(event) => setAttendanceForm({ ...attendanceForm, period: event.target.value })} /></label>
              </div>
              <div className="academic-roster-heading"><strong>{students.length} students</strong><button type="button" className="academic-text-button" onClick={() => setPresentStudents(Object.fromEntries(students.map((student) => [student.id, true])))}>Mark all present</button></div>
              <div className="academic-roster">
                {students.map((student) => (
                  <label key={student.id} className="academic-roster-row">
                    <input type="checkbox" checked={Boolean(presentStudents[student.id])} onChange={(event) => setPresentStudents({ ...presentStudents, [student.id]: event.target.checked })} />
                    <span>{student.fullName}</span><small>{student.rollNumber || student.section || 'Student'}</small>
                  </label>
                ))}
                {!students.length && <p className="academic-empty">No students found for this semester and class.</p>}
              </div>
              <button className="academic-primary-button" disabled={saving || !students.length}><Plus size={17} />{saving ? 'Saving…' : 'Save attendance'}</button>
            </form>
          )}
          {dashboard?.attendance?.length ? (
            <div className="academic-attendance-list">
              {dashboard.attendance.map((subject) => {
                const percent = subject.total ? Math.round((subject.attended / subject.total) * 100) : 0
                return (
                  <article className="academic-attendance-row" key={subject.subject}>
                    <div className="academic-subject-avatar"><BookOpen size={18} /></div>
                    <div className="academic-attendance-subject"><strong>{subject.subject}</strong><span>{subject.attended} present · {subject.total - subject.attended} absent · {subject.total} total</span></div>
                    <div className="academic-progress-wrap"><div className="academic-progress-track"><span style={{ width: `${percent}%` }} /></div><strong>{percent}%</strong></div>
                  </article>
                )
              })}
            </div>
          ) : !isFaculty ? (
            <div className="academic-empty-card"><CheckCircle2 size={28} /><h3>No attendance recorded yet</h3><p>Your semester attendance summary will appear here after your faculty records a class.</p></div>
          ) : null}
        </div>
      )}

      {activeTab === 'quizzes' && (
        <div className="academic-section">
          <div className="academic-section-heading"><div><h2>Unix System Programming</h2><p>Original practice questions, organized into five syllabus modules.</p></div><span className="academic-course-chip">VTU · 5th semester</span></div>
          {selectedQuiz ? (
            <form className="academic-quiz-card" onSubmit={submitQuiz}>
              <button type="button" className="academic-back-button" onClick={() => { setSelectedQuiz(null); setQuizResult(null); setError('') }}>← All modules</button>
              <span className="academic-module-label">{selectedQuiz.module}</span>
              <h3>{selectedQuiz.title}</h3>
              {quizResult ? (
                <div className="academic-quiz-result"><Trophy size={30} /><strong>{quizResult.score} / {quizResult.totalQuestions}</strong><span>Your attempt has been saved. Your best module score counts toward the rankings.</span></div>
              ) : (
                <>
                  {selectedQuiz.questions.map((question, questionIndex) => (
                    <fieldset className="academic-question" key={`${selectedQuiz.id}-${questionIndex}`}>
                      <legend><span>Q{questionIndex + 1}</span>{question.prompt}</legend>
                      <div className="academic-options">
                        {question.options.map((option, optionIndex) => (
                          <label key={option} className={answers[questionIndex] === optionIndex ? 'selected' : ''}>
                            <input type="radio" name={`question-${questionIndex}`} required checked={answers[questionIndex] === optionIndex} onChange={() => setAnswers(answers.map((answer, index) => index === questionIndex ? optionIndex : answer))} />
                            {option}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                  <button className="academic-primary-button" disabled={saving || answers.length !== selectedQuiz.questions.length || answers.some((answer) => answer === undefined)}>
                    {saving ? 'Submitting…' : 'Submit answers'}
                  </button>
                </>
              )}
            </form>
          ) : (
            <div className="academic-module-grid">
              {quizzes.map((quiz) => {
                const attempts = dashboard?.quizAttempts?.filter((attempt) => attempt.quizId === quiz.id) || []
                const best = attempts.reduce((highest, attempt) => Math.max(highest, attempt.score), 0)
                return (
                  <button type="button" className="academic-module-card" key={quiz.id} onClick={() => {
                    setSelectedQuiz(quiz)
                    setAnswers(Array(quiz.questions.length).fill(undefined))
                    setQuizResult(null)
                    setError('')
                  }}>
                    <span className="academic-module-number">{quiz.module.replace('Module ', '0')}</span>
                    <span className="academic-module-label">{quiz.questions.length} questions</span>
                    <strong>{quiz.title}</strong>
                    <span className="academic-module-best">{attempts.length ? `Best score ${best}/${quiz.questions.length}` : 'Not attempted yet'} <span>→</span></span>
                  </button>
                )
              })}
            </div>
          )}
          <p className="academic-source-note">Practice questions cover core UNIX topics including system overview, file I/O, processes, IPC and shell programming.</p>
        </div>
      )}

      {activeTab === 'timetable' && (
        <div className="academic-section">
          <div className="academic-section-heading"><div><h2>Weekly timetable</h2><p>Class schedule for your department and semester.</p></div></div>
          {isFaculty && (
            <form className="academic-form-card academic-timetable-form" onSubmit={handleTimetableSubmit}>
              <div className="academic-form-heading"><CalendarDays size={19} /><div><h3>Add timetable class</h3><p>Share a schedule entry with your semester.</p></div></div>
              <div className="academic-form-grid">
                <label>Subject<input required maxLength="120" value={timetableForm.subject} onChange={(event) => setTimetableForm({ ...timetableForm, subject: event.target.value })} /></label>
                <label>Day<select value={timetableForm.dayOfWeek} onChange={(event) => setTimetableForm({ ...timetableForm, dayOfWeek: event.target.value })}>{weekdays.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label>
                <label>Starts<input required type="time" value={timetableForm.startTime} onChange={(event) => setTimetableForm({ ...timetableForm, startTime: event.target.value })} /></label>
                <label>Ends<input required type="time" value={timetableForm.endTime} onChange={(event) => setTimetableForm({ ...timetableForm, endTime: event.target.value })} /></label>
                <label>Room<input required maxLength="80" value={timetableForm.room} onChange={(event) => setTimetableForm({ ...timetableForm, room: event.target.value })} /></label>
              </div>
              <button className="academic-primary-button" disabled={saving}><Plus size={17} />Add class</button>
            </form>
          )}
          {dashboard?.timetable?.length ? (
            <div className="academic-timetable-list">
              {weekdays.map((day, index) => {
                const classes = dashboard.timetable.filter((entry) => entry.dayOfWeek === index + 1)
                if (!classes.length) return null
                return <section className="academic-day-group" key={day}><h3>{day}</h3>{classes.map((entry) => <article className="academic-timetable-row" key={entry.id}><span className="academic-time"><Clock3 size={15} />{entry.startTime} – {entry.endTime}</span><strong>{entry.subject}</strong><span>{entry.room}</span>{isFaculty && entry.createdById === currentUser?.id && <button type="button" className="academic-delete-button" aria-label={`Remove ${entry.subject} from timetable`} disabled={saving} onClick={() => handleTimetableDelete(entry)}><Trash2 size={15} /></button>}</article>)}</section>
              })}
            </div>
          ) : <div className="academic-empty-card"><CalendarDays size={28} /><h3>No timetable posted</h3><p>When faculty adds your weekly classes, the schedule will show up here.</p></div>}
        </div>
      )}

      {activeTab === 'results' && (
        <div className="academic-section">
          <div className="academic-section-heading"><div><h2>Semester results</h2><p>Published marks and exam scores for {semester}.</p></div></div>
          {isFaculty && (
            <form className="academic-form-card" onSubmit={handleResultSubmit}>
              <div className="academic-form-heading"><Award size={19} /><div><h3>Publish a result</h3><p>Results are visible to the selected student.</p></div></div>
              <div className="academic-form-grid">
                <label>Student<select required value={resultForm.studentId} onChange={(event) => setResultForm({ ...resultForm, studentId: event.target.value })}>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}{student.rollNumber ? ` · ${student.rollNumber}` : ''}</option>)}</select></label>
                <label>Subject<input required maxLength="120" value={resultForm.subject} onChange={(event) => setResultForm({ ...resultForm, subject: event.target.value })} /></label>
                <label>Assessment<input required maxLength="80" value={resultForm.examType} onChange={(event) => setResultForm({ ...resultForm, examType: event.target.value })} /></label>
                <label>Score<input required type="number" min="0" step="0.5" value={resultForm.score} onChange={(event) => setResultForm({ ...resultForm, score: event.target.value })} /></label>
                <label>Out of<input required type="number" min="0.5" step="0.5" value={resultForm.maxScore} onChange={(event) => setResultForm({ ...resultForm, maxScore: event.target.value })} /></label>
              </div>
              <button className="academic-primary-button" disabled={saving || !students.length}><Plus size={17} />Publish result</button>
            </form>
          )}
          {dashboard?.results?.length ? (
            <div className="academic-results-list">
              {dashboard.results.map((result) => <article className="academic-result-row" key={result.id}><span className="academic-result-icon"><Medal size={19} /></span><div><strong>{result.subject}</strong><span>{result.examType} · {new Date(result.publishedAt).toLocaleDateString()}</span></div><strong className="academic-result-score">{result.score}<small> / {result.maxScore}</small></strong></article>)}
            </div>
          ) : <div className="academic-empty-card"><Award size={28} /><h3>No results published yet</h3><p>Published semester marks will appear here.</p></div>}
        </div>
      )}

      {activeTab === 'rankings' && (
        <div className="academic-section">
          <div className="academic-section-heading"><div><h2>Unix quiz rankings</h2><p>Ranked by each student’s best score across all five modules.</p></div><span className="academic-course-chip"><Trophy size={15} /> {dashboard?.leaderboard?.length || 0} students</span></div>
          <div className="academic-leaderboard">
            {(dashboard?.leaderboard || []).map((student) => (
              <article className={`academic-rank-row ${student.id === currentUser?.id ? 'current-student' : ''}`} key={student.id}>
                <span className={`academic-rank-number ${student.rank <= 3 ? 'top-rank' : ''}`}>{student.rank <= 3 ? <Medal size={19} /> : `#${student.rank}`}</span>
                <span className="academic-rank-avatar">{student.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                <span className="academic-rank-name"><strong>{student.fullName}{student.id === currentUser?.id ? ' (You)' : ''}</strong><small>{student.modulesCompleted} of {quizzes.length} modules attempted</small></span>
                <strong className="academic-rank-score">{student.score}<small> / {student.totalQuestions}</small></strong>
              </article>
            ))}
            {!dashboard?.leaderboard?.length && <div className="academic-empty-card"><Trophy size={28} /><h3>No rankings yet</h3><p>Complete a Unix quiz to get on the class leaderboard.</p></div>}
          </div>
          <p className="academic-source-note">Only each student’s best attempt per module is counted. Complete more modules to improve your total.</p>
        </div>
      )}
    </section>
  )
}

export default AcademicHub
