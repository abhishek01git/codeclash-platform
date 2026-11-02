# ⚔️ CodeClash: MERN Competitive Coding, Coin Betting Duels & Live Mock Interview Platform

A full-stack **MERN (MongoDB, Express, React, Node.js)** platform engineered with all LeetCode features, a real-time **1v1 Coin Betting Arena**, daily gamified quests, social community networking (friends, following, chat), and an **Online Technical Mock Interview Room** with collaborative synchronized coding and system design whiteboard.

---

## 🌟 Key Platform Features

### 1. 💻 Full  Coding Platform
* **Problem Catalog**: Filter by Difficulty (*Easy*, *Medium*, *Hard*), Completion Status (*Solved*, *Todo*), and Tags (*Array, String, Dynamic Programming, Two Pointers, Stack, Hash Table, Math*).
* **Rich Problem Workspace**: Detailed problem descriptions, formatted examples with explanations, constraints, and interactive expandable hints.
* **In-Browser Monaco Code Editor**: Dark theme (VS Code / LeetCode style), syntax highlighting, line numbers, automatic indentation, language switcher (JavaScript, Python), and template reset.
* **Code Execution & Evaluation Engine**:
  * **Run Code**: Tests against public sample test cases & custom inputs, captures stdout console logs, computes execution time (ms) and memory.
  * **Submit Code**: Evaluates against hidden edge cases and secret test inputs. Awards *Accepted* with victory confetti, updates acceptance rate, records submission history, and awards bonus coins.
* **Editorial & Discussion Forum**: Official approach explanations, complexity analyses ($O(N)$), upvoting community solutions, and posting comments (+10 bonus coins for sharing solutions!).
* **Submissions History**: Inspect past runs, execution times, memory percentiles, and view submitted source code.

---

### 2. ⚔️ 1v1 Coding Battle & Coin Betting Arena
* **Coin Wagers & Escrow Pot**: Players wager coins (e.g. 50, 100, 250, 500 Coins) into a secure match pot.
* **Winner-Takes-All ("Who codes first gets both coins")**:
  * Both players are given the same LeetCode problem simultaneously.
  * First player to pass 100% of the test cases triggers instant victory!
  * The entire match pot (both wagers combined) is paid out to the winner immediately.
* **Real-Time Live Opponent Progress**:
  * Socket.io broadcasts passed test cases in real-time (e.g., *"Opponent passed 3/5 test cases!"*).
  * Opponent typing and progress bar updates live.
* **Arena Banter & Chat**: Live trash talk and match chat log inside the duel screen.
* **Duel Leaderboard**: Global Hall of Fame ranking top duelists by coins won and win rate %.

---

### 3. 🪙 Daily Login Streaks & Gamified Quests
* **7-Day Daily Login Streak**:
* **Daily Quests & Tasks**:
  * *Problem Solver I*: Solve 1 Easy problem (+30 Coins)
  * *Algo Champion*: Solve 1 Medium/Hard problem (+60 Coins)
  * *Arena Gladiator*: Win a 1v1 duel (+100 Coins)
  * *Community Networker*: Send a chat message (+20 Coins)
  * *Knowledge Sharer*: Post a solution in Discussions (+40 Coins)
* Live task progress meters with interactive claim buttons and celebratory confetti!

---

### 4. 👥 Social Network, Friends & Direct Chat
* **Friend System**: Search users, send friend requests, accept/decline incoming requests (+15 Friendship Bonus coins awarded on acceptance!).
* **Following / Followers**: Follow top competitive coders and see their activity stream.
* **Real-Time 1-on-1 Chat**:
  * Direct messaging with instant WebSocket delivery.
  * Online presence indicators and unread message counters.
  * **"⚔️ Propose Duel Bet"** button in chat: Send interactive duel wager invites directly inside the conversation thread!
* **Community Activity Feed**: Live feed of friend solves, duel victories, and earned badges.

---

### 5. 🎙️ Live Technical Mock Interview Platform
* **Candidate & Interviewer Modes**: Create or join interview rooms via unique shareable Room IDs.
* **Synchronized Collaborative Editor**: Real-time multi-cursor/code typing sync via WebSockets.
* **Interviewer Problem Control**: Interviewer can switch candidate questions on the fly.
* **Interactive System Design Whiteboard**: Shared canvas with pen, eraser, color palette, and clear canvas for drawing architecture diagrams.
* **Mock Video / Audio Bar**: Camera toggles, mic mute/unmute with pulsing audio indicator.
* **Interviewer Evaluation Scorecard**: Rubric for Problem Solving (1-5), Code Quality (1-5), and Communication (1-5), recommendation dropdown (*Strong Hire, Hire, Leaning Hire, No Hire*), written feedback, and +50 bonus coins awarded to both participants!

---

## 🛠️ Tech Stack (MERN)

* **MongoDB & Mongoose**: Schemas for Users, Problems, Submissions, Duels, Messages, Discussions, and Interview Rooms. Supports both local MongoDB and MongoDB Atlas, with an embedded persistent database fallback.
* **Express.js**: REST API with JWT authentication, code evaluation sandbox, and escrow transactions.
* **React 19 & Vite**: Ultra-fast build tool, responsive dark mode design matching LeetCode styling.
* **Node.js**: Backend server runtime and `node:vm` sandbox code execution engine.
* **Socket.io**: Real-time WebSockets for 1v1 coding duels, live opponent test progress, direct chat, and interview sync.
* **Monaco Editor**: The industry-standard code editor used by VS Code and LeetCode.
* **Tailwind CSS v4 & Lucide Icons**: Modern LeetCode dark aesthetics, badge components, and animations.

---

## 🚀 Running the Project

# Start backend server (port 5000)
npm run server

# In another terminal, start client (port 5173)
npm run client
```

Or run directly in their respective folders:
```bash
# Backend:
cd server
npm start

# Frontend:
cd client
npm run dev
```

Open your browser at **`http://localhost:5173/`**.

### Authentication setup

Email registrations are created only after the user enters the six-digit OTP sent to their inbox. Copy `server/.env.example` to `server/.env` and configure a working SMTP account plus a long, random `JWT_SECRET`.

For Google Sign-In, create a **Web application** OAuth client in Google Cloud Console. Add your local and deployed origins to its authorized JavaScript origins, then set the same client ID in both files:

```bash
# server/.env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# client/.env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

The backend validates Google ID tokens and their audience before issuing its own seven-day CodeClash JWT. Never put SMTP passwords or `JWT_SECRET` values in the client environment file.

---

