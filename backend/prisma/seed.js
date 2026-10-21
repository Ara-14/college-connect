import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing communication data to allow fresh seed
  await prisma.messageAttachment.deleteMany()
  await prisma.messageReadReceipt.deleteMany()
  await prisma.messageReport.deleteMany()
  await prisma.message.deleteMany()
  await prisma.conversationMember.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.userBlock.deleteMany()
  await prisma.academicResource.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('college123', 10)

  // 1. Create College
  const college = await prisma.college.upsert({
    where: { name: 'Visvesvaraya Technological University' },
    update: {},
    create: {
      name: 'Visvesvaraya Technological University',
      domain: 'vtu.ac.in',
      location: 'Belagavi / Bangalore, Karnataka',
    },
  })

  // 2. Create Faculty Users
  const profRamesh = await prisma.user.create({
    data: {
      email: 'ramesh@vtu.edu',
      username: 'ramesh_hod',
      fullName: 'Prof. Ramesh Kulkarni',
      passwordHash,
      role: 'FACULTY',
      department: 'Computer Science & Engineering',
      collegeId: college.id,
      collegeName: college.name,
      rollNumber: 'FAC-CSE-101',
      bio: 'Professor & Head of Department, Computer Science. Office Hours: Mon-Thu 2:00 PM - 4:00 PM (Room 302)',
      officeHours: 'Mon-Thu 2:00 PM - 4:00 PM (Room 302)',
      allowStudentDMs: true,
      status: 'ONLINE',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    },
  })

  const drAnanya = await prisma.user.create({
    data: {
      email: 'ananya@vtu.edu',
      username: 'ananya_prof',
      fullName: 'Dr. Ananya Sharma',
      passwordHash,
      role: 'FACULTY',
      department: 'Computer Science & Engineering',
      collegeId: college.id,
      collegeName: college.name,
      rollNumber: 'FAC-CSE-204',
      bio: 'Assistant Professor, Cloud Computing & Distributed Systems. Welcoming all academic queries!',
      officeHours: 'Tue-Fri 3:00 PM - 5:00 PM (Lab 4)',
      allowStudentDMs: true,
      status: 'ONLINE',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200',
    },
  })

  const profSunitha = await prisma.user.create({
    data: {
      email: 'sunitha@vtu.edu',
      username: 'sunitha_rao',
      fullName: 'Prof. Sunitha Rao',
      passwordHash,
      role: 'FACULTY',
      department: 'Information Science',
      collegeId: college.id,
      collegeName: college.name,
      rollNumber: 'FAC-ISE-305',
      bio: 'Associate Professor, Database Systems. Note: Please use Class Announcements for Q&A.',
      officeHours: 'Wednesdays 11:00 AM - 1:00 PM',
      allowStudentDMs: false, // DMs restricted by faculty policy
      status: 'ONLINE',
      avatarUrl: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=200',
    },
  })

  // 3. Create Student Users
  const aarav = await prisma.user.create({
    data: {
      email: 'aarav@vtu.edu',
      username: 'aarav_sharma',
      fullName: 'Aarav Sharma',
      passwordHash,
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
      semester: '5th Sem',
      section: 'Section A',
      yearOfStudy: '3rd Year',
      rollNumber: '1VT22CS014',
      bio: 'CSE Student | Competitive Programmer | Hackathon Enthusiast 🚀',
      collegeId: college.id,
      collegeName: college.name,
      status: 'ONLINE',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
    },
  })

  const priya = await prisma.user.create({
    data: {
      email: 'priya@vtu.edu',
      username: 'priya_reddy',
      fullName: 'Priya Reddy',
      passwordHash,
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
      semester: '5th Sem',
      section: 'Section A',
      yearOfStudy: '3rd Year',
      rollNumber: '1VT22CS089',
      bio: 'AI & Data Science aspirant | Class Representative 📚✨',
      collegeId: college.id,
      collegeName: college.name,
      status: 'ONLINE',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    },
  })

  const rahul = await prisma.user.create({
    data: {
      email: 'rahul@vtu.edu',
      username: 'rahul_codes',
      fullName: 'Rahul Kumar',
      passwordHash,
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
      semester: '5th Sem',
      section: 'Section B',
      yearOfStudy: '3rd Year',
      rollNumber: '1VT22CS102',
      bio: 'Full-stack Web Dev | Open Source Contributor 💻',
      collegeId: college.id,
      collegeName: college.name,
      status: 'AWAY',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    },
  })

  const sneha = await prisma.user.create({
    data: {
      email: 'sneha@vtu.edu',
      username: 'sneha_art',
      fullName: 'Sneha Patel',
      passwordHash,
      role: 'STUDENT',
      department: 'Information Science',
      semester: '3rd Sem',
      section: 'Section A',
      yearOfStudy: '2nd Year',
      rollNumber: '1VT23IS045',
      bio: 'Design Club Lead & Tech Enthusiast 🎨',
      collegeId: college.id,
      collegeName: college.name,
      status: 'OFFLINE',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
    },
  })

  // 4. Create Subjects & Academic Resources (preserving study materials)
  const dsaSubject = await prisma.subject.create({
    data: {
      code: '21CS32',
      name: 'Data Structures & Algorithms',
      department: 'Computer Science & Engineering',
      semester: '3rd Sem',
    },
  })

  await prisma.academicResource.create({
    data: {
      title: 'Module 1 & 2: Stacks, Queues & Linked Lists Hand-Written Notes',
      description: 'Comprehensive notes covering stack operations, queue variants and circular lists with diagrams.',
      category: 'NOTES',
      fileUrl: '/uploads/DSA_Module_1_2_Notes.pdf',
      fileFormat: 'PDF',
      fileSize: '3.4 MB',
      subjectId: dsaSubject.id,
      uploaderId: profRamesh.id,
    },
  })

  // 5. Create Initial Communication Scenarios

  // SCENARIO 1: Faculty to Faculty Group Chat
  const facultyGroup = await prisma.conversation.create({
    data: {
      title: 'CSE Faculty Academic Committee',
      description: 'Departmental coordination, exam evaluation schedules, and lab equipment reviews.',
      type: 'GROUP',
      isFacultyOnly: true,
      department: 'Computer Science & Engineering',
      createdById: profRamesh.id,
      members: {
        create: [
          { userId: profRamesh.id, role: 'ADMIN' },
          { userId: drAnanya.id, role: 'MEMBER' },
        ],
      },
    },
  })

  const fMsg1 = await prisma.message.create({
    data: {
      conversationId: facultyGroup.id,
      senderId: profRamesh.id,
      content: 'Good morning Dr. Ananya. Have you finalized the 5th Semester Cloud Computing midterm schedule?',
      messageType: 'TEXT',
    },
  })

  const fMsg2 = await prisma.message.create({
    data: {
      conversationId: facultyGroup.id,
      senderId: drAnanya.id,
      content: 'Yes Prof. Ramesh, the schedule is ready. I will share the draft PDF and rubric below.',
      messageType: 'TEXT',
      replyToId: fMsg1.id,
    },
  })

  // SCENARIO 2: Faculty to Students - Class Announcement Group
  const classAnnouncement = await prisma.conversation.create({
    data: {
      title: 'CSE 5th Sem - Official Announcements',
      description: 'Official department announcements, assignment deadlines, and syllabus updates.',
      type: 'ANNOUNCEMENT',
      isReadOnly: true, // Only faculty post
      department: 'Computer Science & Engineering',
      semester: '5th Sem',
      createdById: profRamesh.id,
      members: {
        create: [
          { userId: profRamesh.id, role: 'ADMIN' },
          { userId: drAnanya.id, role: 'ADMIN' },
          { userId: aarav.id, role: 'MEMBER' },
          { userId: priya.id, role: 'MEMBER' },
          { userId: rahul.id, role: 'MEMBER' },
        ],
      },
    },
  })

  const annMsg1 = await prisma.message.create({
    data: {
      conversationId: classAnnouncement.id,
      senderId: profRamesh.id,
      content: '📢 IMPORTANT: The Assignment 2 on Dynamic Programming is due on Friday, 5:00 PM. Late submissions will receive a 10% penalty.',
      messageType: 'ANNOUNCEMENT',
      isPinned: true,
    },
  })

  await prisma.conversation.update({
    where: { id: classAnnouncement.id },
    data: { pinnedMessageId: annMsg1.id },
  })

  // SCENARIO 3: Student to Student Study Group
  const studyGroup = await prisma.conversation.create({
    data: {
      title: 'Algo Masters - 5th Sem Study Group',
      description: 'Peer study circle for algorithm design, VTU question paper practice, and project sync.',
      type: 'GROUP',
      isFacultyOnly: false,
      department: 'Computer Science & Engineering',
      semester: '5th Sem',
      createdById: aarav.id,
      members: {
        create: [
          { userId: aarav.id, role: 'ADMIN' },
          { userId: priya.id, role: 'MEMBER' },
          { userId: rahul.id, role: 'MEMBER' },
        ],
      },
    },
  })

  await prisma.message.create({
    data: {
      conversationId: studyGroup.id,
      senderId: aarav.id,
      content: 'Hey Priya and Rahul! Let us review the Bellman-Ford problem set this evening at the library.',
      messageType: 'TEXT',
    },
  })

  await prisma.message.create({
    data: {
      conversationId: studyGroup.id,
      senderId: priya.id,
      content: 'Count me in! I also have the solved 2024 VTU question paper notes that I can share.',
      messageType: 'TEXT',
    },
  })

  // SCENARIO 4: Student to Faculty - Academic Query Direct Message
  const studentFacultyQuery = await prisma.conversation.create({
    data: {
      title: 'Academic Query: Graph Algorithms',
      description: 'Query regarding Dijkstra vs Bellman-Ford negative edge handling.',
      type: 'QUERY',
      subject: 'Data Structures & Algorithms',
      createdById: aarav.id,
      members: {
        create: [
          { userId: aarav.id, role: 'MEMBER' },
          { userId: profRamesh.id, role: 'ADMIN' },
        ],
      },
    },
  })

  await prisma.message.create({
    data: {
      conversationId: studentFacultyQuery.id,
      senderId: aarav.id,
      content: 'Respected Sir, could you please clarify why Dijkstra fails with negative edge weights even if there are no negative cycles?',
      messageType: 'TEXT',
      queryCategory: 'Doubt Clarification',
    },
  })

  await prisma.message.create({
    data: {
      conversationId: studentFacultyQuery.id,
      senderId: profRamesh.id,
      content: 'Aarav, Dijkstra makes a greedy choice assuming that once a vertex is marked visited, its minimum distance cannot be reduced further. A negative edge later violates that assumption. Review slide 42 in the Module 3 handout.',
      messageType: 'TEXT',
      queryCategory: 'Doubt Clarification',
    },
  })

  // SCENARIO 5: 1-to-1 Student to Student Chat
  const studentDM = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      members: {
        create: [
          { userId: aarav.id, role: 'MEMBER' },
          { userId: priya.id, role: 'MEMBER' },
        ],
      },
    },
  })

  await prisma.message.create({
    data: {
      conversationId: studentDM.id,
      senderId: priya.id,
      content: 'Hey Aarav! Did you register for the Inter-College Hackathon?',
      messageType: 'TEXT',
    },
  })

  await prisma.message.create({
    data: {
      conversationId: studentDM.id,
      senderId: aarav.id,
      content: 'Yes! Registered our team yesterday. Super excited! 🚀',
      messageType: 'TEXT',
    },
  })

  // SCENARIO 6: 1-to-1 Faculty to Student (Dr. Ananya & Aarav)
  const facultyStudentDM = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      members: {
        create: [
          { userId: drAnanya.id, role: 'MEMBER' },
          { userId: aarav.id, role: 'MEMBER' },
        ],
      },
    },
  })

  await prisma.message.create({
    data: {
      conversationId: facultyStudentDM.id,
      senderId: drAnanya.id,
      content: 'Aarav, excellent work on your AWS EC2 lab submission. Your architecture diagram was very thorough.',
      messageType: 'TEXT',
    },
  })

  // Initial Notifications
  await prisma.notification.create({
    data: {
      recipientId: aarav.id,
      actorId: profRamesh.id,
      type: 'ANNOUNCEMENT',
      title: 'New Department Announcement',
      message: 'Prof. Ramesh posted: Assignment 2 on Dynamic Programming is due on Friday.',
      entityId: classAnnouncement.id,
    },
  })

  await prisma.notification.create({
    data: {
      recipientId: aarav.id,
      actorId: drAnanya.id,
      type: 'MESSAGE',
      title: 'Message from Dr. Ananya Sharma',
      message: 'Aarav, excellent work on your AWS EC2 lab submission.',
      entityId: facultyStudentDM.id,
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('Users created:')
  console.log('- Prof. Ramesh Kulkarni (FACULTY) -> ramesh@vtu.edu / college123')
  console.log('- Dr. Ananya Sharma (FACULTY)     -> ananya@vtu.edu / college123')
  console.log('- Prof. Sunitha Rao (FACULTY)     -> sunitha@vtu.edu / college123 (DMs restricted)')
  console.log('- Aarav Sharma (STUDENT)         -> aarav@vtu.edu / college123')
  console.log('- Priya Reddy (STUDENT)          -> priya@vtu.edu / college123')
  console.log('- Rahul Kumar (STUDENT)          -> rahul@vtu.edu / college123')
  console.log('- Sneha Patel (STUDENT)          -> sneha@vtu.edu / college123')
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
