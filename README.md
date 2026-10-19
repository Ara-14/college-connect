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

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **PostgreSQL:** Port `5432`

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
npm run dev
```

#### 3. Start Frontend
```powershell
cd ../frontend
npm install
npm run dev
```
