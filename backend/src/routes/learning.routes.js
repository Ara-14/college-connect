import { Router } from 'express'
import prisma from '../config/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { unixQuizzes } from './academic-quizzes.js'

const router = Router()
const facultyRoles = ['FACULTY', 'ADMIN']
const validTime = /^([01]\d|2[0-3]):[0-5]\d$/

const studentCohort = (user, semester = user.semester) => ({
  role: 'STUDENT',
  department: user.department,
  semester,
  ...(user.collegeId ? { collegeId: user.collegeId } : {}),
  ...(user.section ? { section: user.section } : {}),
})

const isFaculty = (user) => facultyRoles.includes(user.role)

router.use(authenticate)

router.get('/dashboard', async (req, res, next) => {
  const requestedSemester = typeof req.query.semester === 'string' ? req.query.semester.trim() : ''
  if (requestedSemester.length > 30) {
    return res.status(400).json({ error: 'The semester value is too long.' })
  }
  try {
    const semester = requestedSemester || req.user.semester || '5th Sem'
    const [marks, timetable, results, cohort, attempts] = await Promise.all([
      prisma.academicAttendanceMark.findMany({
        where: { studentId: req.user.id, session: { semester } },
        include: { session: true },
        orderBy: { session: { classDate: 'desc' } },
      }),
      prisma.academicTimetableEntry.findMany({
        where: {
          department: req.user.department || '',
          semester,
          OR: [{ section: null }, { section: req.user.section || null }],
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      prisma.academicResult.findMany({
        where: { studentId: req.user.id, semester },
        orderBy: [{ publishedAt: 'desc' }, { subject: 'asc' }],
      }),
      prisma.user.findMany({
        where: studentCohort(req.user, semester),
        select: { id: true, fullName: true, rollNumber: true },
      }),
      prisma.quizAttempt.findMany({
        where: {
          semester,
          user: {
            department: req.user.department,
            semester,
            ...(req.user.collegeId ? { collegeId: req.user.collegeId } : {}),
            ...(req.user.section ? { section: req.user.section } : {}),
            role: 'STUDENT',
          },
        },
        select: {
          userId: true,
          quizId: true,
          score: true,
          totalQuestions: true,
        },
      }),
    ])

    const attendanceBySubject = new Map()
    for (const mark of marks) {
      const current = attendanceBySubject.get(mark.session.subject) || { subject: mark.session.subject, attended: 0, total: 0 }
      current.total += 1
      if (mark.attended) current.attended += 1
      attendanceBySubject.set(mark.session.subject, current)
    }

    const bestScores = new Map()
    for (const attempt of attempts) {
      const key = `${attempt.userId}:${attempt.quizId}`
      const previous = bestScores.get(key)
      const ratio = attempt.totalQuestions ? attempt.score / attempt.totalQuestions : 0
      if (!previous || ratio > previous.ratio) {
        bestScores.set(key, { userId: attempt.userId, quizId: attempt.quizId, score: attempt.score, totalQuestions: attempt.totalQuestions, ratio })
      }
    }

    const totals = new Map(cohort.map((student) => [student.id, { ...student, score: 0, modulesCompleted: 0 }]))
    for (const best of bestScores.values()) {
      const total = totals.get(best.userId)
      if (total) {
        total.score += best.score
        total.modulesCompleted += 1
      }
    }
    const leaderboard = [...totals.values()]
      .filter((student) => student.modulesCompleted > 0)
      .sort((a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName))
      .map((student, index, list) => ({
        ...student,
        rank: index > 0 && list[index - 1].score === student.score ? list[index - 1].rank : index + 1,
        totalQuestions: unixQuizzes.length * unixQuizzes[0].questions.length,
      }))

    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId: req.user.id, semester },
      orderBy: { completedAt: 'desc' },
      select: { id: true, quizId: true, score: true, totalQuestions: true, completedAt: true },
    })

    res.json({
      semester,
      attendance: [...attendanceBySubject.values()],
      timetable,
      results,
      quizAttempts,
      leaderboard,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/students', async (req, res, next) => {
  if (!isFaculty(req.user)) {
    return res.status(403).json({ error: 'Only faculty can view the class roster.' })
  }
  const semester = typeof req.query.semester === 'string' ? req.query.semester.trim() : ''
  if (!semester || semester.length > 30) {
    return res.status(400).json({ error: 'A valid semester is required.' })
  }

  try {
    const students = await prisma.user.findMany({
      where: studentCohort(req.user, semester),
      select: { id: true, fullName: true, rollNumber: true, section: true },
      orderBy: { fullName: 'asc' },
    })
    res.json({ students })
  } catch (error) {
    next(error)
  }
})

router.post('/attendance/sessions', async (req, res, next) => {
  if (!isFaculty(req.user)) {
    return res.status(403).json({ error: 'Only faculty can record class attendance.' })
  }

  const { subject, semester, classDate, period, marks } = req.body
  const date = typeof classDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(classDate)
    ? new Date(`${classDate}T00:00:00.000Z`)
    : null
  if (
    typeof subject !== 'string' || !subject.trim() || subject.trim().length > 120
    || typeof semester !== 'string' || !semester.trim() || semester.trim().length > 30
    || !date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== classDate
    || !Number.isInteger(period) || period < 1 || period > 16
    || !Array.isArray(marks) || marks.length === 0
    || marks.some((mark) => !mark || typeof mark.studentId !== 'string' || typeof mark.attended !== 'boolean')
    || new Set(marks.map((mark) => mark.studentId)).size !== marks.length
  ) {
    return res.status(400).json({ error: 'Provide a subject, semester, class date, period, and one attendance status per student.' })
  }

  try {
    const students = await prisma.user.findMany({
      where: { ...studentCohort(req.user, semester), id: { in: marks.map((mark) => mark.studentId) } },
      select: { id: true },
    })
    if (students.length !== marks.length) {
      return res.status(400).json({ error: 'Attendance can only be recorded for students in your class.' })
    }

    const session = await prisma.academicAttendanceSession.create({
      data: {
        subject: subject.trim(),
        semester: semester.trim(),
        department: req.user.department || '',
        section: req.user.section || '',
        classDate: date,
        period,
        markedById: req.user.id,
        marks: { create: marks.map(({ studentId, attended }) => ({ studentId, attended })) },
      },
      include: { marks: true },
    })
    res.status(201).json({ session })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Attendance for this subject, date, and period has already been recorded.' })
    }
    next(error)
  }
})

router.post('/timetable', async (req, res, next) => {
  if (!isFaculty(req.user)) {
    return res.status(403).json({ error: 'Only faculty can manage the class timetable.' })
  }
  const { subject, semester, dayOfWeek, startTime, endTime, room } = req.body
  if (
    typeof subject !== 'string' || !subject.trim() || subject.trim().length > 120
    || typeof semester !== 'string' || !semester.trim() || semester.trim().length > 30
    || !Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 6
    || typeof startTime !== 'string' || !validTime.test(startTime)
    || typeof endTime !== 'string' || !validTime.test(endTime) || endTime <= startTime
    || typeof room !== 'string' || !room.trim() || room.trim().length > 80
  ) {
    return res.status(400).json({ error: 'Provide a valid subject, semester, weekday, class time, and room.' })
  }

  try {
    const entry = await prisma.academicTimetableEntry.create({
      data: {
        department: req.user.department || '',
        semester: semester.trim(),
        section: req.user.section || null,
        dayOfWeek,
        startTime,
        endTime,
        subject: subject.trim(),
        room: room.trim(),
        createdById: req.user.id,
      },
    })
    res.status(201).json({ entry })
  } catch (error) {
    next(error)
  }
})

router.delete('/timetable/:id', async (req, res, next) => {
  if (!isFaculty(req.user)) {
    return res.status(403).json({ error: 'Only faculty can manage the class timetable.' })
  }
  try {
    const entry = await prisma.academicTimetableEntry.findFirst({
      where: {
        id: req.params.id,
        createdById: req.user.id,
        department: req.user.department || '',
      },
      select: { id: true },
    })
    if (!entry) {
      return res.status(404).json({ error: 'The timetable entry was not found or is not managed by you.' })
    }
    await prisma.academicTimetableEntry.delete({ where: { id: entry.id } })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

router.post('/results', async (req, res, next) => {
  if (!isFaculty(req.user)) {
    return res.status(403).json({ error: 'Only faculty can publish student results.' })
  }
  const { studentId, subject, semester, examType, score, maxScore } = req.body
  if (
    typeof studentId !== 'string'
    || typeof subject !== 'string' || !subject.trim() || subject.trim().length > 120
    || typeof semester !== 'string' || !semester.trim() || semester.trim().length > 30
    || typeof examType !== 'string' || !examType.trim() || examType.trim().length > 80
    || !Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore
  ) {
    return res.status(400).json({ error: 'Provide a student, subject, semester, exam type, and valid score.' })
  }

  try {
    const student = await prisma.user.findFirst({
      where: { ...studentCohort(req.user, semester), id: studentId },
      select: { id: true },
    })
    if (!student) {
      return res.status(404).json({ error: 'The selected student is not in your class.' })
    }
    const result = await prisma.academicResult.upsert({
      where: {
        studentId_subject_semester_examType: {
          studentId,
          subject: subject.trim(),
          semester: semester.trim(),
          examType: examType.trim(),
        },
      },
      create: {
        studentId,
        publishedById: req.user.id,
        subject: subject.trim(),
        semester: semester.trim(),
        examType: examType.trim(),
        score,
        maxScore,
      },
      update: { score, maxScore, publishedById: req.user.id, publishedAt: new Date() },
    })
    res.status(201).json({ result })
  } catch (error) {
    next(error)
  }
})

router.get('/quizzes', (req, res) => {
  res.json({
    quizzes: unixQuizzes.map(({ id, module, title, questions }) => ({
      id,
      module,
      title,
      questions: questions.map(({ prompt, options }) => ({ prompt, options })),
    })),
  })
})

router.post('/quizzes/:quizId/attempts', async (req, res, next) => {
  const quiz = unixQuizzes.find(({ id }) => id === req.params.quizId)
  if (!quiz) {
    return res.status(404).json({ error: 'The requested quiz was not found.' })
  }
  const { answers, semester = req.user.semester || '5th Sem' } = req.body
  if (
    typeof semester !== 'string'
    || !semester.trim()
    || semester.trim().length > 30
    || !Array.isArray(answers)
    || answers.length !== quiz.questions.length
    || answers.some((answer) => !Number.isInteger(answer) || answer < 0 || answer > 3)
  ) {
    return res.status(400).json({ error: 'Answer every question before submitting the quiz.' })
  }

  try {
    const score = quiz.questions.reduce((total, question, index) => total + (answers[index] === question.answer ? 1 : 0), 0)
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: req.user.id,
        quizId: quiz.id,
        semester: semester.trim(),
        score,
        totalQuestions: quiz.questions.length,
      },
      select: { id: true, quizId: true, score: true, totalQuestions: true, completedAt: true },
    })
    res.status(201).json({ attempt })
  } catch (error) {
    next(error)
  }
})

export default router
