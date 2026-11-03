# 🟢 Express Backend — Unshell

Node.js + Express gateway layer. This is the **only service the React frontend talks to**. It handles routing, MongoDB persistence, and proxies AI requests to the internal Python microservice.

## Responsibilities

- Expose a clean REST API (`/api/*`) to the React frontend
- Handle investigator authentication (JWT creation, `bcryptjs` hashing, and bearer token protection)
- Persist investigation results to **MongoDB Atlas** via Mongoose, strictly scoped by `userId`
- Forward investigation requests to the Python AI microservice (server-to-server, no CORS)
- Stream multipart PDF uploads to the Python service via `multer` + `axios`

## Project Structure

```
backend/
├── server.js                 # Express app entry point
├── config/
│   └── db.js                 # MongoDB Atlas connection (Mongoose)
├── middleware/
│   └── auth.js               # JWT verification & route protection
├── routes/
│   ├── auth.js               # Auth route definitions (/api/auth/*)
│   └── investigate.js        # Investigation & user-scoped history routes
├── controllers/
│   ├── authController.js     # Auth logic, login, registration, /me profile
│   └── investigateController.js # Investigation handling & DB scoping
├── models/
│   ├── User.js               # User schema with bcrypt password hashing
│   └── Investigation.js      # Investigation schema linked to User
├── services/
│   └── aiServiceClient.js    # HTTP proxy to Python AI microservice
├── .env.example
└── package.json
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
PORT=5000
MONGO_URI=mongodb+srv://...   # MongoDB Atlas connection string
JWT_SECRET=your_jwt_secret_key_here
AI_SERVICE_URL=http://localhost:8000
```

## Running

```bash
npm install
node server.js
```

Server starts at **http://localhost:5000**

## API Endpoints

| Endpoint | Method | Auth | Body / Params | Description |
|---|---|---|---|---|
| `/api/health` | GET | Public | — | Health check |
| `/api/auth/register` | POST | Public | `{ name, email, password, role }` | Register new investigator |
| `/api/auth/login` | POST | Public | `{ email, password }` | Login & receive JWT |
| `/api/auth/me` | GET | Protected | Bearer Token | Current investigator profile |
| `/api/investigate` | POST | Optional | `{ crn }` | CRN-based investigation (tags user if logged in) |
| `/api/investigate/document` | POST | Optional | `FormData { file }` | PDF investigation |
| `/api/approve/:threadId` | POST | Optional | `FormData { file }` | HITL resume |
| `/api/history` | GET | Protected | `?limit&skip` | List current user's investigations |
| `/api/history/:id` | GET | Protected | — | Load single saved investigation |
| `/api/history/:id` | DELETE | Protected | — | Delete user's saved investigation |
