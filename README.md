# TaskFlow - Production-Ready Task Management Application

A full-stack MERN (MongoDB, Express.js, React, Node.js) task management application with secure authentication, scalable backend architecture, and a modern frontend.

## Tech Stack

### Backend
- **Node.js** + **Express.js** 5.x
- **MongoDB** with Mongoose ODM
- **JWT** (HTTP-only cookies)
- **bcrypt** for password hashing
- **Zod** for request validation
- **express-mongo-sanitize** for injection prevention
- **express-rate-limit** for rate limiting
- Optional **AES-256-GCM** encryption for task descriptions

### Frontend
- **React 18** + **Vite**
- **React Router** for routing
- **TypeScript**
- **Tailwind CSS**
- Fetch API with `credentials: "include"` for cookie-based auth

## Project Structure

```
inter_task/
├── server/                 # Express backend
│   ├── api/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.js
│   │   └── index.js
│   └── package.json
├── client/                 # React (Vite) frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   └── lib/
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Local Development

#### 1. Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT_SECRET
npm run dev
```

Backend runs at `http://localhost:5000`

#### 2. Frontend Setup

```bash
cd client
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api/v1
npm run dev
```

Frontend runs at `http://localhost:3000`

#### 3. Environment Variables

**Server (.env)**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/taskmanager
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000

# Optional: Encrypt task descriptions
# ENCRYPT_DESCRIPTION=true
# ENCRYPTION_KEY=your-32-char-key
```

**Client (.env)**
```
VITE_API_URL=http://localhost:5000/api/v1
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/users/register` | Register new user |
| POST | `/api/v1/users/login` | Login user |
| GET | `/api/v1/users/me` | Get current user (protected) |
| POST | `/api/v1/users/logout` | Logout (protected) |

**Register Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

**Register Response:**
```json
{
  "statusCode": 201,
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "message": "User registered successfully"
}
```

**Login Request:**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

### Tasks (all require authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tasks` | Create task |
| GET | `/api/v1/tasks` | Get tasks (paginated, filterable) |
| GET | `/api/v1/tasks/:id` | Get task by ID |
| PATCH | `/api/v1/tasks/:id` | Update task |
| DELETE | `/api/v1/tasks/:id` | Delete task |

**Create Task Request:**
```json
{
  "title": "Complete project",
  "description": "Finish the MERN stack app",
  "status": "pending"
}
```

**Get Tasks Query Params:**
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `status` (optional: pending | in_progress | completed)
- `search` (optional: partial title match)

**Get Tasks Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "tasks": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

## Authentication Flow

1. **Register/Login**: User submits credentials → Server validates → Password hashed (bcrypt) / compared → JWT generated → Token stored in **HTTP-only, Secure** cookie
2. **Protected Routes**: Client sends request with `credentials: "include"` → Cookie automatically sent → Server middleware verifies JWT → `req.user` populated
3. **Logout**: Client calls `/logout` → Server clears cookie

### Why HTTP-only Cookies?
- Prevents XSS attacks (JavaScript cannot access the cookie)
- Automatic inclusion in same-origin/cors requests with `credentials: include`
- Secure flag in production ensures HTTPS-only transmission

## Architecture Decisions

### Backend
- **Centralized Error Handling**: `errorHandler` middleware catches all errors, returns consistent JSON
- **Validation**: Zod schemas validate request body/query before controllers
- **Ownership Middleware**: Ensures users can only modify their own tasks (403 on unauthorized)
- **Mongo Sanitization**: Prevents `$` and `.` injection in queries
- **Rate Limiting**: 100 requests per 15 minutes per IP on `/api/*`

### Frontend
- **Auth Context**: Global auth state, fetches `/me` on mount
- **Route Protection**: Dashboard redirects to login if unauthenticated
- **Debounced Search**: 300ms debounce on task search to reduce API calls

## Deployment

### Backend (Render / Railway / AWS)

1. Set environment variables in your platform
2. Build command: (none - Node.js)
3. Start command: `node api/index.js` (from server directory)
4. Ensure `FRONTEND_URL` matches your deployed frontend URL
5. For MongoDB: Use MongoDB Atlas connection string

### Frontend (Vercel / Netlify)

1. Connect repository, set root directory to `client`
2. Set `VITE_API_URL` to your deployed backend URL (e.g. `https://your-api.onrender.com/api/v1`)
3. Build command: `npm run build`
4. Output directory: `dist`

### CORS
Backend CORS allows: `localhost:3000`, `localhost:5173`, and `FRONTEND_URL`. Add your production frontend URL to `FRONTEND_URL` env var.

## Optional Enhancements

- **AES Encryption**: Set `ENCRYPT_DESCRIPTION=true` and `ENCRYPTION_KEY` to encrypt task descriptions at rest
- **Refresh Tokens**: Implement refresh token rotation for longer sessions
- **Rate Limiting**: Adjust `max` in `express-rate-limit` for production

## License

ISC
