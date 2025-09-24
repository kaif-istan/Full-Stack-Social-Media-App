## PingUp – Social Media Platform

A full‑stack social media application with a React + Vite frontend and an Express + MongoDB backend. It supports authentication via Clerk, posting with media uploads (ImageKit), real‑time messaging via Server‑Sent Events (SSE), stories with auto‑expiry, social graph (follow/connect), scheduled/background jobs with Inngest, and email notifications via Nodemailer.

### Features
- **Clerk Authentication**: Client uses `@clerk/clerk-react`; server protects routes using `@clerk/express` middleware.
- **Posts**: Create text/image posts, like/unlike, fetch personalized feed.
- **Stories**: Create stories (text/image/video); auto-deleted after 24 hours via Inngest.
- **Connections**: Follow/unfollow, send/accept connection requests, discover users.
- **Messaging**: Real‑time notifications using SSE; chat history with seen status.
- **Media Handling**: Uploads via Multer; stored/transformed with ImageKit.
- **Background Jobs**: Inngest handles user sync from Clerk, story deletion, connection request emails, and daily unseen message reminders.
- **Email Notifications**: Nodemailer configured (Brevo SMTP) for transactional emails.

---

## Installation

### Prerequisites
- Node.js 18+ and npm
- MongoDB database (cloud or local)
- ImageKit account (public/private keys + endpoint)
- Clerk account (Publishable and Secret keys)
- SMTP credentials (e.g., Brevo) for sending emails

### 1) Clone and install
```bash
git clone <your-repo-url>
cd "Social Media Platform"

# Install client
cd client
npm install

# Install server
cd ../server
npm install
```

### 2) Environment variables

Create environment files with the following variables.

Client (`client/.env`):
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_BASEURL=http://localhost:4000
```

Server (`server/.env`):
```bash
PORT=4000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# Clerk
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# ImageKit
IMAGEKIT_PUBLIC_KEY=...
IMAGEKIT_PRIVATE_KEY=...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<your_id>

# App URLs used in emails
FRONTEND_URL=http://localhost:5173

# SMTP (Brevo example)
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
SENDER_EMAIL=Your App <noreply@yourdomain.com>
```

Notes:
- `server/configs/db.js` connects to `${MONGO_URI}/pingup`.
- Clerk middleware reads keys from env; ensure both client and server keys are set.
- Image uploads use temporary disk storage via Multer and are uploaded to ImageKit.

### 3) Run locally

In two terminals:
```bash
# Terminal 1 – server
cd server
npm run server

# Terminal 2 – client
cd client
npm run dev
```

Client will start (Vite) and server will listen on `PORT` (default 4000).

---

## Usage

### Authentication
- The app uses Clerk. The client wraps the app in `ClerkProvider` with `VITE_CLERK_PUBLISHABLE_KEY`.
- The server enforces auth on protected routes using `protect` middleware which reads `req.auth()` from Clerk.

### API base URL
- Client `axios` instance points to `VITE_BASEURL`.

### Real‑time messages
- The client opens `EventSource(VITE_BASEURL + '/api/message/' + user.id)` to receive push messages.

---

## Configuration

- `client/src/api/axios.js`: uses `VITE_BASEURL`.
- `client/src/main.jsx`: requires `VITE_CLERK_PUBLISHABLE_KEY`.
- `server/configs/db.js`: uses `MONGO_URI`.
- `server/configs/imageKit.js`: uses ImageKit keys/endpoint.
- `server/configs/nodeMailer.js`: uses SMTP credentials and `SENDER_EMAIL`.
- `server/inngest/index.js`: uses `FRONTEND_URL` in emails; defines multiple functions and exposes `/api/inngest` endpoint.
- `server/middlewares/auth.js`: `protect` uses Clerk `req.auth()`.

---

## API Overview

Base path: `/api`

User (`/api/user`):
- `GET /data` – Get current user profile (protected)
- `POST /update` – Update user profile (multer `profile`, `cover`) (protected)
- `POST /discover` – Search users by username/email/name/location (protected)
- `POST /follow` – Follow a user (protected)
- `POST /unfollow` – Unfollow a user (protected)
- `POST /connect` – Send connection request (rate‑limited by logic) (protected)
- `POST /accept` – Accept connection request (protected)
- `GET /connections` – Get connections/followers/following/pending (protected)
- `POST /profiles` – Get a profile and posts by `profileId`
- `GET /recent-messages` – Get recent inbound messages (protected)

Post (`/api/post`):
- `POST /add` – Create post (multer `images[]`, max 4) (protected)
- `GET /feed` – Personalized feed (protected)
- `POST /like` – Like/unlike a post (protected)

Story (`/api/story`):
- `POST /create` – Create story (multer single `media`) (protected)
- `GET /get` – Get stories from user + network (protected)

Message (`/api/message`):
- `GET /:userId` – SSE stream for real‑time messages
- `POST /send` – Send message (optional `image`) (protected)
- `POST /get` – Get chat messages with `to_user_id` (protected)

Inngest (`/api/inngest`):
- Inngest HTTP handler to serve functions and receive events.

---

## Project Structure

```
Social Media Platform/
├─ client/                  # React + Vite frontend
│  ├─ src/
│  │  ├─ api/axios.js      # axios client using VITE_BASEURL
│  │  ├─ app/store.js      # Redux store
│  │  ├─ features/         # user, connections, messages slices
│  │  ├─ pages/            # Login, Feed, Messages, etc.
│  │  └─ components/       # UI components (PostCard, StoriesBar, etc.)
│  ├─ vite.config.js
│  └─ vercel.json          # SPA rewrites
└─ server/                  # Express backend
   ├─ server.js             # App entry, routes, middleware
   ├─ configs/              # db, multer, imageKit, nodeMailer
   ├─ controllers/          # user, post, story, message
   ├─ middlewares/          # auth (Clerk)
   ├─ models/               # Mongoose models (User, Post, Story, Message)
   ├─ routes/               # userRoutes, postRoutes, storyRoutes, messageRoutes
   ├─ inngest/              # Inngest client & functions
   └─ vercel.json           # Server deployment config
```

---

## Contributing
1. Fork the repository and create a feature branch.
2. Run locally and ensure both client and server start without errors.
3. Follow the existing code style and folder conventions.
4. Open a pull request with a clear description of changes.

---

## Testing

No automated tests are currently configured. Recommended next steps:
- Add unit tests for controllers and slices (e.g., Jest + Supertest for server).
- Add component tests for critical UI (e.g., React Testing Library).

---

## Deployment

### Vercel
- Client: `client/vercel.json` rewrites all paths to `/` for SPA routing.
- Server: `server/vercel.json` config targets `server.js` using `@vercel/node`.
- Ensure environment variables are set in Vercel for both projects.

### Self‑hosting
```bash
# Server
cd server
npm run start

# Client (build + serve)
cd ../client
npm run build
npm run preview
```

---

## License

This project is licensed under the **ISC License** (per `server/package.json`). If a `LICENSE` file is added later, that file takes precedence.

---

## Credits / Acknowledgements
- **Frontend**: React, Vite, React Router, Redux Toolkit, Tailwind CSS, Lucide Icons, React Hot Toast
- **Auth**: Clerk (`@clerk/clerk-react`, `@clerk/express`)
- **Backend**: Express, Mongoose, Multer, CORS, Dotenv
- **Media**: ImageKit SDK for uploads and transformations
- **Background Jobs**: Inngest (cron, event‑driven steps, sleepUntil)
- **Email**: Nodemailer (Brevo SMTP)


