# PeersQ — Full Stack Real-Time Quiz Platform

A Mentimeter/AhaSlides-style interactive quiz platform with AI-powered quiz generation, real-time play for up to 50 participants, QR code joining, and live leaderboards.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB Atlas (free tier) |
| AI | Groq API (Llama 3.3 70B) |
| Realtime | Socket.IO WebSockets |
| Deploy Frontend | Vercel (free) |
| Deploy Backend | Render (free) |

---

## Local Development Setup

### 1. Clone / unzip the project
```bash
cd peersq
```

### 2. Install all dependencies
```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 3. Configure environment variables

**Backend** — copy and fill in:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=some_long_random_secret_string_here
GROQ_API_KEY=your_groq_api_key
CLIENT_URL=http://localhost:5173
NODE_ENV=development
MAX_FILE_SIZE_MB=10
```

**Frontend** — copy and fill in:
```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:
```
VITE_API_URL=http://localhost:5000
```

### 4. Start development servers

Open two terminals:

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Visit: http://localhost:5173

---

## Getting Your API Keys

### MongoDB Atlas (Free)
1. Go to https://cloud.mongodb.com
2. Create a free account → New Project → Build a Database
3. Choose **M0 Free Tier** → AWS → any region
4. Create a database user (save username + password)
5. Under "Network Access" → Add IP Address → **Allow access from anywhere** (0.0.0.0/0)
6. Go to "Database" → Connect → "Drivers" → copy the connection string
7. Replace `<password>` with your actual password in the string
8. The string looks like: `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/peersq?retryWrites=true&w=majority`

### Groq API Key (Free)
1. Go to https://console.groq.com
2. Sign up (free, no credit card)
3. Go to API Keys → Create API Key
4. Copy the key (starts with `gsk_...`)
5. Free tier: 14,400 requests/day — more than enough

---

## Deploying to Production (Free)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial PeersQ commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/peersq.git
git push -u origin main
```

---

### Step 2: Deploy Backend on Render (Free)

1. Go to https://render.com → Sign up with GitHub
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `peersq-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Add Environment Variables (click "Advanced" → "Add Environment Variable"):
   ```
   NODE_ENV          = production
   PORT              = 10000
   MONGODB_URI       = your_mongodb_connection_string
   JWT_SECRET        = your_long_random_secret
   GROQ_API_KEY      = your_groq_api_key
   CLIENT_URL        = https://your-frontend.vercel.app  ← fill after Step 3
   MAX_FILE_SIZE_MB  = 10
   ```
6. Click **Create Web Service**
7. Wait ~3 minutes for deployment
8. Copy your backend URL: `https://peersq-backend.onrender.com`

> ⚠️ **Free Render note**: The free tier spins down after 15 min of inactivity. First request after sleep takes ~30s. Upgrade to Starter ($7/mo) for always-on.

---

### Step 3: Deploy Frontend on Vercel (Free)

1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New Project**
3. Import your GitHub repo
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   ```
   VITE_API_URL = https://peersq-backend.onrender.com
   ```
6. Click **Deploy**
7. Your app is live at `https://peersq-xxx.vercel.app`

---

### Step 4: Update CORS on Backend

Go back to Render → Your backend service → Environment:
- Update `CLIENT_URL` to your actual Vercel URL: `https://peersq-xxx.vercel.app`
- Click **Save Changes** → Render will redeploy automatically

---

## Project Structure

```
peersq/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express + Socket.IO server entry
│   │   ├── models/
│   │   │   ├── User.js           # User schema
│   │   │   ├── Quiz.js           # Quiz + questions schema
│   │   │   └── Session.js        # Live session + participants schema
│   │   ├── routes/
│   │   │   ├── auth.js           # Register, login, /me
│   │   │   ├── quiz.js           # CRUD for quizzes
│   │   │   ├── session.js        # Create session, get by code, results
│   │   │   └── upload.js         # PDF/TXT upload + Groq AI generation
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT authentication middleware
│   │   └── socket/
│   │       └── socketManager.js  # All real-time Socket.IO logic
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx              # React entry point
│   │   ├── App.jsx               # Router + providers
│   │   ├── index.css             # Tailwind + custom styles
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx   # Auth state + login/register/logout
│   │   │   └── SocketContext.jsx # Socket.IO connection provider
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx   # Public home page
│   │   │   ├── LoginPage.jsx     # Login form
│   │   │   ├── RegisterPage.jsx  # Registration form
│   │   │   ├── DashboardPage.jsx # Host's quiz management
│   │   │   ├── QuizEditorPage.jsx# Full quiz builder + AI generator
│   │   │   ├── HostSessionPage.jsx # Live host control panel
│   │   │   ├── JoinPage.jsx      # Participant join screen
│   │   │   ├── PlayPage.jsx      # Participant game view
│   │   │   └── ResultsPage.jsx   # Post-session results
│   │   └── utils/
│   │       └── api.js            # Axios instance with auth interceptors
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── vercel.json
│
├── render.yaml                   # Render deployment config
└── README.md
```

---

## How It Works

### Quiz Flow
1. **Host** creates a quiz (manual or AI-generated from PDF/TXT)
2. **Host** launches a session → gets a 6-character code + QR code
3. **Participants** go to `/join` and enter the code (or scan QR)
4. **Host** starts the quiz → questions are pushed to all participants via Socket.IO
5. Each question has a **countdown timer** — faster correct answers = more points
6. After each question, **answer stats** shown to host; participants see if they were right
7. **Leaderboard** updates after every question
8. Final results saved to MongoDB — accessible from dashboard

### Scoring System
- Base points per question: 50–1000 (configurable)
- Time bonus: up to 50% extra for fast answers
- Formula: `points = basePoints × (0.5 + 0.5 × (1 - timeTaken/timeLimit))`

### Socket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `host:join_session` | Client→Server | Host connects to session room |
| `host:start_quiz` | Client→Server | Host starts the quiz |
| `host:next_question` | Client→Server | Move to next question |
| `host:end_question` | Client→Server | Manually end current question |
| `host:show_leaderboard` | Client→Server | Show leaderboard to all |
| `participant:join` | Client→Server | Participant joins session |
| `participant:answer` | Client→Server | Participant submits answer |
| `question:start` | Server→Client | New question pushed to participants |
| `question:start_host` | Server→Client | Full question (with answers) to host |
| `question:ended` | Server→Clients | Question ended, show correct answer |
| `leaderboard:show` | Server→Clients | Leaderboard data |
| `quiz:finished` | Server→Clients | Final results |
| `participants:updated` | Server→Clients | Participant list changed |
| `host:answer_update` | Server→Host | How many have answered |

---

## Troubleshooting

**Socket not connecting?**
- Check `VITE_API_URL` in frontend `.env` matches your backend URL exactly
- Check `CLIENT_URL` in backend `.env` matches your frontend URL exactly
- Render free tier may be sleeping — wait 30s for first connection

**AI generation not working?**
- Verify `GROQ_API_KEY` is set correctly (starts with `gsk_`)
- Check Groq dashboard for rate limit status at console.groq.com
- Make sure uploaded file is valid PDF or plain text

**MongoDB connection failing?**
- Make sure IP 0.0.0.0/0 is whitelisted in Atlas Network Access
- Double-check the connection string has your actual password

**CORS errors?**
- `CLIENT_URL` in backend must exactly match the frontend origin (no trailing slash)
- Example: `https://peersq-abc.vercel.app` (not `https://peersq-abc.vercel.app/`)

---

## Customization

**Change max participants**: Edit `Session.js` model → `maxParticipants` default value  
**Add question types**: Extend `questionSchema` in `Quiz.js` and add UI in `QuizEditorPage.jsx`  
**Change AI model**: In `upload.js`, change `model: 'llama-3.3-70b-versatile'` to any Groq model  
**Change theme colors**: Edit `tailwind.config.js` and `index.css` CSS variables  
