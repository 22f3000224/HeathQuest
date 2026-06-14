# HealthQuest AI - Backend Integration

This document explains the backend integration for the Frontend_new folder.

## Quick Start

### Option 1: Run Integrated Setup
```bash
# From project root
start_integrated.bat
```

This starts:
- Backend API: http://localhost:8000
- Original Frontend: http://localhost:5173
- **New Integrated Frontend: http://localhost:5174**

### Option 2: Manual Setup

1. **Start Backend**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

2. **Start New Frontend**
```bash
cd Frontend_new
npm install
npm run dev
```

## Backend Integration Features

### API Service (`src/services/api.js`)
- Centralized API client for all backend communication
- Handles health checks, log submission, AI narration, chronicles, etc.
- Automatic fallback to local data if backend fails

### Enhanced Store Integration (`src/store/useSanctuaryStore.js`)
- `submitLog()` now syncs with backend and gets AI narration
- `generateChronicle()` uses backend AI for weekly reflections
- `generateStory()` creates full sanctuary narratives

### Connected Pages

#### Daily Log (`src/pages/DailyLog.jsx`)
- Submits logs to backend via API
- Gets AI-generated companion responses
- Continues offline if backend unavailable

#### Companion Screen (`src/pages/CompanionScreen.jsx`)
- **Today's Advice**: AI-powered insights from backend
- **Weekly Reflection**: AI-generated chronicles
- **Sanctuary Status**: Real-time wellness metrics

#### Chronicle Screen (`src/pages/ChronicleScreen.jsx`)
- AI-generated weekly chronicles instead of static text
- Backend integration for rich storytelling
- Fallback to local content if needed

## Configuration

### Environment Variables (Frontend_new/.env)
```env
VITE_API_URL=http://localhost:8000
```

### Backend Environment (backend/.env)
```env
GROQ_API_KEY=your_groq_api_key_here
FRONTEND_ORIGIN=http://localhost:5174
```

## API Endpoints Used

| Endpoint | Purpose | Frontend Usage |
|----------|---------|----------------|
| `POST /analyze` | World state calculation | Daily log processing |
| `POST /narrate` | AI companion responses | Post-log narration |
| `POST /chronicle` | Weekly reflections | Chronicle generation |
| `POST /story` | Full sanctuary story | Story screen |
| `POST /artifact` | Milestone memories | Museum artifacts |
| `GET /health` | Backend health check | Connection verification |

## Offline Fallback

The frontend gracefully handles backend unavailability:
- Stores data locally using Zustand persistence
- Shows default messages if AI narration fails
- Continues core functionality without backend
- Syncs when backend becomes available

## Development Notes

- Frontend runs on port 5174 (vs original on 5173)
- All backend calls are wrapped with try/catch for resilience
- Loading states show "Listening to the sanctuary..." during AI generation
- Console warnings (not errors) when backend calls fail

## Screenshots

Images used by the frontend (stored in `Frontend_new/docs`):

- Landing Page: ![Landing Page](docs/LandingPage.webp)
- Companion Dashboard: ![Companion Dashboard](docs/ComapnionDashboard.png)
- Daily Log Screen: ![Daily Log](docs/DailyLogScreen.webp)
- Sanctuary Main: ![Sanctuary Main](docs/SanctuaryMain.png)
- Sanctuary Creation: ![Sanctuary Creation](docs/SanctuaryCreation.webp)
- Museum of Progress: ![Museum](docs/MuseumOfProgress.webp)
- Chronicle Storybook: ![Chronicle Storybook](docs/ChronicleStoryBook.jpg)