# Athena - AI Study Companion

An AI-powered study tool that helps students understand difficult concepts by finding relevant YouTube educational videos.

## 📁 Project Structure

```
athena-mvp/
├── client/          # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
├── server/          # Express backend
│   ├── index.js
│   └── package.json
└── package.json     # Root scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- A Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

1. Install all dependencies:
```bash
npm run install:all
```

2. Configure the server `.env`:
```env
# server/.env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

3. Configure the client `.env` (optional):
```env
# client/.env
VITE_API_URL=http://localhost:3001
```

### Running the App

**Run both frontend and backend together:**
```bash
npm run dev
```

**Or run them separately:**
```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

## 🛠️ Tech Stack

### Frontend
- React 19
- Vite 7
- Tailwind CSS 4
- Lucide React (icons)

### Backend
- Express.js
- Google Generative AI (Gemini)
- CORS
- dotenv

## 📝 How It Works

1. Student pastes confusing text they don't understand
2. Athena (powered by Gemini AI) analyzes the text
3. AI identifies the core concept and searches for relevant YouTube videos
4. Returns curated list of educational videos with explanations

## 💜 Built with love for students, by students
