# CodeSync — Real-Time Collaborative Code Editor

A production-grade, Google Docs-style collaborative IDE built as a final year Computer Science Engineering project. Multiple users can edit code simultaneously in real time with cursor tracking, live chat, and sandboxed code execution.

---

## Features

| Feature | Description |
|---|---|
| Real-time collaboration | Multiple users edit the same file with OT-based conflict resolution |
| Live cursors | See other users' cursors with name labels in real time |
| Monaco Editor | VS Code's editor — syntax highlighting, IntelliSense, formatting |
| Multi-file projects | Create, rename, delete files within a room |
| Live chat | Per-room chat panel with system join/leave messages |
| Code execution | Run Python, JS, C++, Java in Docker sandboxes |
| JWT authentication | Register, login, protected routes |
| Auto-save | Every 5 seconds + on file switch + version history |
| Room management | Create rooms, share by link, join by code |

---

## Tech Stack

**Frontend:** React 18 · Vite · TailwindCSS · Monaco Editor · Socket.io-client

**Backend:** Node.js · Express · Socket.io · Mongoose · ioredis

**Database:** MongoDB 7

**Cache / Scaling:** Redis 7 (pub/sub for multi-instance WebSocket scaling)

**Execution:** Docker (per-language Alpine containers with memory + CPU limits)

**Infrastructure:** Nginx · Docker Compose

---

## Architecture

```
Browsers (React + Monaco)
        │  WebSocket + REST
        ▼
   Nginx (reverse proxy)
        │
   ┌────┴────┐
   │         │
Node REST  Node Socket.io
(Express)  (OT engine)
   │         │
   └────┬────┘
        │
   ┌────┴────┐
MongoDB    Redis
(persist)  (pub/sub)
        │
   Docker Executor
(Python/JS/C++/Java)
```

### Operational Transformation

Each `code_change` socket event carries `{ type, position, text/length, version }`.

The server holds a history of accepted ops per file. When a client sends an op at version V, the server transforms it against all concurrent ops (those that arrived since V) before applying and broadcasting. Clients maintain a pending queue of unacknowledged ops and transform incoming remote ops against pending local ops using the same algorithm.

---

## Project Structure

```
codesync/
├── backend/
│   ├── controllers/      authController, roomController, fileController
│   ├── models/           User, Room, File (with versions), Message
│   ├── routes/           auth, rooms, files, projects
│   ├── middlewares/      authMiddleware (JWT protect + socket verify)
│   ├── socket/
│   │   ├── socketHandler.js    All Socket.io events
│   │   └── otEngine.js         Operational Transformation engine
│   ├── utils/
│   │   └── codeRunner.js       Docker sandbox executor
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor/         CodeEditor.jsx, OutputPanel.jsx
│   │   │   ├── FileExplorer/   FileExplorer.jsx
│   │   │   ├── Chat/           ChatPanel.jsx
│   │   │   ├── Users/          UsersPanel.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/              Login, Register, Dashboard, Editor, Profile
│   │   ├── context/            AuthContext.jsx
│   │   ├── hooks/              useSocket.js, useCollaboration.js
│   │   ├── services/           api.js (Axios), socket.js (Socket.io singleton)
│   │   ├── App.jsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis
- Docker (optional, for code execution)

### 1. Clone

```bash
git clone https://github.com/your-username/codesync.git
cd codesync
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:3000**, backend at **http://localhost:5000**.

---

## Environment Variables

### backend/.env

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/codesync
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key_change_this
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

---

## Docker (full stack)

```bash
# Copy and edit .env first
cp backend/.env.example backend/.env

# Build and start everything
docker-compose up --build

# Services:
#   Frontend  → http://localhost:3000
#   Backend   → http://localhost:5000
#   MongoDB   → localhost:27017
#   Redis     → localhost:6379
```

---

## REST API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✓ | Get current user |
| GET | `/api/rooms` | ✓ | List user's rooms |
| POST | `/api/rooms/create` | ✓ | Create room |
| GET | `/api/rooms/:roomId` | ✓ | Get room + file list |
| DELETE | `/api/rooms/:roomId` | ✓ | Delete room |
| GET | `/api/files/:fileId` | ✓ | Get file content |
| POST | `/api/files/create` | ✓ | Create file in room |
| PUT | `/api/files/update` | ✓ | Save file content |
| DELETE | `/api/files/delete` | ✓ | Delete file |
| GET | `/api/files/:fileId/history` | ✓ | Version history |
| GET | `/api/projects/:roomId` | ✓ | All files for room |

---

## Socket.io Events

| Event | Direction | Payload |
|---|---|---|
| `join_room` | Client → Server | `{ roomId, user, fileId }` |
| `file_loaded` | Server → Client | `{ fileId, content, version, language }` |
| `room_users` | Server → Room | `{ users[] }` |
| `code_change` | Both | `{ fileId, op, roomId }` |
| `op_ack` | Server → Client | `{ fileId, version }` |
| `full_sync` | Both | `{ fileId, content, roomId }` |
| `cursor_move` | Both | `{ roomId, fileId, cursor, user }` |
| `typing` | Both | `{ roomId, user, isTyping }` |
| `chat_message` | Both | `{ roomId, text, user }` |
| `file_switch` | Client → Server | `{ fileId, roomId }` |
| `run_code` | Client → Server | `{ roomId, language, code }` |
| `run_output` | Server → Client | `{ output, type }` |
| `auto_save` | Client → Server | `{ fileId, content, userId }` |
| `user_joined` | Server → Room | `{ user }` |
| `user_left` | Server → Room | `{ socketId, user }` |

---

## Code Execution Security

User code runs inside Docker containers with:

- `--network=none` — no internet access
- `--memory=128m` — memory cap
- `--cpus=0.5` — CPU limit
- `--read-only` — read-only filesystem
- `--user nobody` — non-root user
- 10-second timeout — kills runaway processes
- Temp files cleaned up after every run

---

## Key Concepts Demonstrated

- **Full-stack development** — React frontend, Node.js backend, REST + WebSocket APIs
- **Real-time systems** — Socket.io rooms, event-driven architecture, debounced broadcasts
- **Distributed collaboration** — Operational Transformation for conflict-free concurrent editing
- **Scalable backend** — Redis pub/sub enables horizontal scaling across multiple Node instances
- **Sandboxed execution** — Docker containers for safe user code execution
- **JWT authentication** — Stateless auth with protected REST routes and socket middleware
- **MongoDB data modeling** — Documents, references, embedded version snapshots

---

## License

MIT
