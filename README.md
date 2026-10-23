# 🎓 College Connect

> A college-exclusive social networking platform combining Instagram-style social feeds, Discord-inspired community channels, and campus-specific networking.

---

## 🌟 Tech Stack

- **Frontend:** React 19, Vite, Lucide Icons, Pure CSS (Purple night-sky theme, animated mascots)
- **Backend:** Node.js, Express.js (ES Modules), Socket.IO
- **Database:** PostgreSQL with Prisma ORM
- **Containerization:** Docker & Docker Compose

---

## 📂 Project Architecture

```
collegeconnect/
├── compose.yaml                # Docker Compose orchestration
├── .gitignore                  # Root gitignore (protects secrets & node_modules)
├── frontend/                   # React frontend
│   ├── public/
│   │   └── college-logo.png    # VTU College Seal
│   ├── src/
│   │   ├── App.jsx             # Main dashboard & screen controller
│   │   ├── App.css             # Instagram + Discord dark styling & animations
│   │   ├── index.css           # Global typography & resets
│   │   └── main.jsx            # React root entry
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.js
└── backend/                    # Express REST API
    ├── prisma/
    │   └── schema.prisma       # Database schema (PostgreSQL)
    ├── src/
    │   ├── config/             # Environment & Prisma client
    │   ├── middleware/         # 404 & Centralized Error Handler
    │   ├── routes/             # API routes (/api/health, etc.)
    │   ├── app.js              # Express app setup & CORS
    │   └── server.js           # HTTP + Socket.IO server entry
    ├── uploads/                # User uploaded media
    ├── Dockerfile
    ├── package.json
    └── .env.example
```

---

## 🚀 How to Run the Project

### Option 1: Using Docker Compose (Recommended)

From the project root directory:

```powershell
docker compose up --build
```

For a new or empty database, apply the checked-in initial schema and additive migrations:
```powershell
docker compose exec backend npx prisma migrate deploy
```

For an existing database created before migrations were introduced, mark its existing schema as the baseline once, then apply pending additive migrations:
```powershell
docker compose exec backend npx prisma migrate resolve --applied 20261023000000_initial_schema
docker compose exec backend npx prisma migrate deploy
```

The community migration adds persistent community events and links channels to their group conversations. These commands preserve existing data; do not use `prisma migrate reset`.

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **PostgreSQL:** Port `5432`

### Personal AI setup

Personal AI uses Google Gemini with Google Search grounding. Create a root `.env` file beside `compose.yaml` and add your key there (never put it in frontend configuration or commit it):

```dotenv
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash
```

Then restart the backend:

```powershell
docker compose up -d --build backend
```

Inside any regular chat or community channel, send `@AI your question` to open a private Personal AI answer with grounded source links. The prompt after `@AI` is sent to Google; conversation messages, attachments, and chat history are not included. AI requests and answers are not posted to the chat. PDF links are shown when a cited source directly links to a PDF. The Gemini key stays in the backend environment.

To stop all services:
```powershell
docker compose down
```

---

### Option 2: Running Directly on Windows (Local Node.js)

#### 1. Start PostgreSQL (e.g., via Docker or local service)
```powershell
docker run --name collegeconnect_postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=collegeconnect -p 5432:5432 -d postgres:16-alpine
```

#### 2. Start Backend
```powershell
cd backend
npm install
npx prisma generate
npm run prisma:push
npm run dev
```

The backend defaults to `postgresql://postgres:postgres@localhost:5432/collegeconnect` in development. Set `DATABASE_URL` in `backend/.env` to override it.

#### 3. Start Frontend
```powershell
cd ../frontend
npm install
npm run dev
```

### Profiles, academic resources, and communities

- Users can edit and save their own profile bio.
- Faculty and admins can publish course notes and official announcement messages.
- Signed-in users can chat in community channels, share images, and record voice notes.
- Signed-in users can publish events within community channels.
- Personal AI answers academic questions using Gemini and Google Search citations when `GEMINI_API_KEY` is configured.
