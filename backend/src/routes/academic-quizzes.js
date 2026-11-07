export const unixQuizzes = [
  {
    id: 'module-1',
    module: 'Module 1',
    title: 'UNIX system overview',
    questions: [
      {
        prompt: 'Which component provides the command-line interface between a user and the UNIX kernel?',
        options: ['Shell', 'Compiler', 'Boot loader', 'File system'],
        answer: 0,
      },
      {
        prompt: 'Which command displays the current working directory?',
        options: ['pwd', 'cd', 'ls', 'who'],
        answer: 0,
      },
      {
        prompt: 'In a UNIX pathname, what does a leading slash represent?',
        options: ['The user home directory', 'The root directory', 'A hidden file', 'The current directory'],
        answer: 1,
      },
    ],
  },
  {
    id: 'module-2',
    module: 'Module 2',
    title: 'File I/O and directories',
    questions: [
      {
        prompt: 'Which system call opens a file and returns a file descriptor?',
        options: ['open()', 'read()', 'stat()', 'mkdir()'],
        answer: 0,
      },
      {
        prompt: 'What does the O_APPEND flag do when opening a file?',
        options: ['Deletes the file before opening', 'Makes the file read-only', 'Positions writes at the end of the file', 'Creates a new directory'],
        answer: 2,
      },
      {
        prompt: 'Which system call reads data from an already-open file descriptor?',
        options: ['read()', 'lseek()', 'unlink()', 'chmod()'],
        answer: 0,
      },
    ],
  },
  {
    id: 'module-3',
    module: 'Module 3',
    title: 'Processes and signals',
    questions: [
      {
        prompt: 'Which system call creates a child process by duplicating the calling process?',
        options: ['fork()', 'exec()', 'wait()', 'exit()'],
        answer: 0,
      },
      {
        prompt: 'What is the primary purpose of the exec family of functions?',
        options: ['Create a new directory', 'Send a signal to every process', 'Replace the current process image with a new program', 'Wait for a file lock'],
        answer: 2,
      },
      {
        prompt: 'Which call lets a parent process collect the termination status of a child?',
        options: ['kill()', 'wait()', 'alarm()', 'pause()'],
        answer: 1,
      },
    ],
  },
  {
    id: 'module-4',
    module: 'Module 4',
    title: 'Pipes and interprocess communication',
    questions: [
      {
        prompt: 'A traditional UNIX pipe is best described as which kind of communication channel?',
        options: ['A byte stream, commonly used between related processes', 'A shared directory', 'A process identifier table', 'A persistent database'],
        answer: 0,
      },
      {
        prompt: 'Which shell operator connects the standard output of one command to another command’s standard input?',
        options: ['>', '&', '|', ';'],
        answer: 2,
      },
      {
        prompt: 'Unlike an unnamed pipe, a FIFO can be opened by unrelated processes because it has what?',
        options: ['A kernel thread', 'A process group', 'A file descriptor table', 'A filesystem name'],
        answer: 3,
      },
    ],
  },
  {
    id: 'module-5',
    module: 'Module 5',
    title: 'Shell programming and process environment',
    questions: [
      {
        prompt: 'Which special shell variable contains the exit status of the most recently completed command?',
        options: ['$?', '$#', '$!', '$@'],
        answer: 0,
      },
      {
        prompt: 'What does the export command do to a shell variable?',
        options: ['Writes it to a file', 'Removes it from the shell', 'Makes it available to child processes in the environment', 'Changes the current directory'],
        answer: 2,
      },
      {
        prompt: 'Which command changes the permissions associated with a file?',
        options: ['chmod', 'chown', 'grep', 'umask'],
        answer: 0,
      },
    ],
  },
]
