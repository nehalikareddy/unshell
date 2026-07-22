# 🟢 Express Backend — Unshell

Node.js + Express gateway layer. This is the **only service the React frontend talks to**. It handles routing, MongoDB persistence, and proxies AI requests to the internal Python microservice.

## Responsibilities

- Expose a clean REST API (`/api/*`) to the React frontend
- Persist investigation results to **MongoDB Atlas** via Mongoose
- Forward investigation requests to the Python AI microservice (server-to-server, no CORS)
- Stream multipart PDF uploads to the Python service via `multer` + `axios`

## Project Structure

```
backend/
├── server.js                 # Express app entry point
├── config/
│   └── db.js                 # MongoDB Atlas connection (Mongoose)
├── routes/
│   └── investigate.js        # Route definitions
├── controllers/
│   └── investigateController.js  # Business logic & MongoDB save
├── models/
│   └── Investigation.js      # Mongoose schema
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
AI_SERVICE_URL=http://localhost:8000
```

## Running

```bash
npm install
node server.js
```

Server starts at **http://localhost:5000**

## API Endpoints

| Endpoint | Method | Body | Description |
|---|---|---|---|
| `/api/health` | GET | — | Health check |
| `/api/investigate` | POST | `{ crn }` | CRN-based investigation |
| `/api/investigate/document` | POST | `FormData { file }` | PDF investigation |
| `/api/approve/:threadId` | POST | `FormData { file }` | HITL resume |
| `/api/history` | GET | `?limit&skip` | List past investigations |
| `/api/history/:id` | GET | — | Load single investigation |
