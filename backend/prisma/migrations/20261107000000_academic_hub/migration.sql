CREATE TABLE "AcademicAttendanceSession" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT '',
    "classDate" TIMESTAMP(3) NOT NULL,
    "period" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "markedById" TEXT NOT NULL,
    CONSTRAINT "AcademicAttendanceSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicAttendanceMark" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL,
    CONSTRAINT "AcademicAttendanceMark_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicTimetableEntry" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "section" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "AcademicTimetableEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "publishedById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "examType" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcademicResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademicAttendanceSession_subject_semester_department_section_classDate_period_key"
ON "AcademicAttendanceSession"("subject", "semester", "department", "section", "classDate", "period");
CREATE INDEX "AcademicAttendanceSession_semester_department_classDate_idx"
ON "AcademicAttendanceSession"("semester", "department", "classDate");
CREATE UNIQUE INDEX "AcademicAttendanceMark_sessionId_studentId_key"
ON "AcademicAttendanceMark"("sessionId", "studentId");
CREATE INDEX "AcademicAttendanceMark_studentId_idx" ON "AcademicAttendanceMark"("studentId");
CREATE INDEX "AcademicTimetableEntry_department_semester_dayOfWeek_idx"
ON "AcademicTimetableEntry"("department", "semester", "dayOfWeek");
CREATE UNIQUE INDEX "AcademicResult_studentId_subject_semester_examType_key"
ON "AcademicResult"("studentId", "subject", "semester", "examType");
CREATE INDEX "AcademicResult_studentId_semester_idx" ON "AcademicResult"("studentId", "semester");
CREATE INDEX "QuizAttempt_userId_quizId_completedAt_idx"
ON "QuizAttempt"("userId", "quizId", "completedAt");

ALTER TABLE "AcademicAttendanceSession" ADD CONSTRAINT "AcademicAttendanceSession_markedById_fkey"
FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicAttendanceMark" ADD CONSTRAINT "AcademicAttendanceMark_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "AcademicAttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicAttendanceMark" ADD CONSTRAINT "AcademicAttendanceMark_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicTimetableEntry" ADD CONSTRAINT "AcademicTimetableEntry_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicResult" ADD CONSTRAINT "AcademicResult_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicResult" ADD CONSTRAINT "AcademicResult_publishedById_fkey"
FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
