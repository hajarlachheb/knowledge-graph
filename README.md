# LearnHub — Knowledge Sharing Platform

A platform where people save and share their learnings (problem/solution), browse others' knowledge, and discover who knows what.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+

No Docker, no external databases — uses SQLite (zero config).

### 1. Configure

```bash
cp .env.example .env
# Optionally edit SECRET_KEY in .env
```

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
python seed.py            # optional: load demo data (3 users, 6 learnings)
uvicorn app.main:app --reload --port 8000
```

API docs: **http://localhost:8000/docs**

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open your browser at **port 3000**

### 4. Try it

If you ran the seed script, you can log in with:

- **Email:** `alice@example.com` **Password:** `password`
- **Email:** `bob@example.com` **Password:** `password`
- **Email:** `carol@example.com` **Password:** `password`

Or create a new account via Sign Up.

---

## Features

- **Share learnings** — Problem/solution format with tags
- **Browse** — Feed with search and tag filtering
- **Profiles** — See who contributed what knowledge
- **Bookmarks** — Save learnings for later
- **Explore topics** — Browse by tags

## Project Structure

```
knowledge-graph/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── config.py          # Settings (SQLite, JWT)
│   │   ├── auth.py            # JWT + password hashing
│   │   ├── models/
│   │   │   └── schemas.py     # Pydantic request/response schemas
│   │   ├── api/
│   │   │   ├── deps.py        # Auth dependencies
│   │   │   ├── auth.py        # POST /register, /login, GET /me
│   │   │   ├── learnings.py   # CRUD + list/search/filter
│   │   │   ├── users.py       # Profiles
│   │   │   ├── tags.py        # Topic browsing
│   │   │   └── bookmarks.py   # Save/unsave
│   │   └── db/
│   │       ├── postgres.py    # SQLite engine + session
│   │       └── models.py      # ORM models
│   ├── seed.py                # Demo data loader
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Root layout + AuthProvider
│   │   │   ├── page.tsx             # Feed (browse learnings)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── explore/page.tsx     # Browse tags
│   │   │   ├── bookmarks/page.tsx
│   │   │   ├── learnings/
│   │   │   │   ├── new/page.tsx     # Create learning
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx     # Learning detail
│   │   │   │       └── edit/page.tsx
│   │   │   └── users/
│   │   │       └── [id]/page.tsx    # User profile
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── LearningCard.tsx
│   │   │   ├── LearningForm.tsx
│   │   │   ├── TagBadge.tsx
│   │   │   └── BookmarkButton.tsx
│   │   └── lib/
│   │       ├── api.ts               # Backend API client
│   │       └── AuthContext.tsx       # Auth state management
│   └── package.json
├── .env.example
└── README.md
```

## API Endpoints

| Method | Path                        | Auth     | Description                     |
|--------|-----------------------------|---------|---------------------------------|
| POST   | `/api/auth/register`        | No      | Create account                  |
| POST   | `/api/auth/login`           | No      | Sign in, get JWT                |
| GET    | `/api/auth/me`              | Yes     | Current user profile            |
| GET    | `/api/learnings`            | Optional | List learnings (search, filter) |
| POST   | `/api/learnings`            | Yes     | Create a learning               |
| GET    | `/api/learnings/{id}`       | Optional | Get learning detail             |
| PUT    | `/api/learnings/{id}`       | Owner   | Update a learning               |
| DELETE | `/api/learnings/{id}`       | Owner   | Delete a learning               |
| GET    | `/api/users/{id}`           | No      | User profile + stats            |
| GET    | `/api/users/{id}/learnings` | Optional | User's learnings                |
| GET    | `/api/tags`                 | No      | All tags with counts            |
| GET    | `/api/bookmarks`            | Yes     | Your bookmarked learnings       |
| POST   | `/api/bookmarks/{id}`       | Yes     | Bookmark a learning             |
| DELETE | `/api/bookmarks/{id}`       | Yes     | Remove bookmark                 |

## Tech Stack

| Component | Technology           |
|-----------|----------------------|
| Backend   | FastAPI (Python)     |
| Frontend  | Next.js 14 + Tailwind |
| Database  | SQLite (via aiosqlite) |
| Auth      | JWT (python-jose)    |
