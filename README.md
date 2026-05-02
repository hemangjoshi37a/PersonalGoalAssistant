# Personal Goal Assistant

A robust, AI-powered Single Page Application (SPA) designed to act as an autonomous executive coach and life manager. The system combines a Flask backend with a modern Vite frontend, leveraging Gemini 1.5 Flash for strategic planning, dynamic daily scheduling, and habit tracking.

## Features
- **Zenith Lab**: 3D visualization of mission topology and real-time AI reasoning streams.
- **Quantum Forge**: Habit formation tracking with streak predictions.
- **Chronos Engine**: Dynamic daily scheduling visualized as a temporal vortex.
- **Aura Nexus**: Personality aura generation based on your interaction styles.
- **Neural Archive**: Expert knowledge base graph.

## Tech Stack
- **Frontend**: Vite, Vanilla JS, Three.js (3D graphics), Vanilla CSS (Glassmorphism design).
- **Backend**: Python, Flask, Flask-SQLAlchemy, Flask-Login.
- **AI/LLM**: Google Gemini (1.5 Flash).
- **Database**: SQLite (local).

## Quick Start

### 1. Backend Setup
Navigate to the root directory and install dependencies:
```bash
pip install -r requirements.txt
```

Create a `.env` file based on the example:
```bash
cp .env.example .env
```
*(Make sure to add your actual `GEMINI_API_KEY` to the `.env` file)*

Initialize and run the Flask server:
```bash
python backend/server.py
```

### 2. Frontend Setup
Open a new terminal, navigate to the `frontend` directory, install dependencies, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```

### 3. Usage
- Open your browser to the local Vite server URL (usually `http://localhost:5173/`).
- Create an account or log in to bypass the guest landing page.
- Launch your first mission in the Console to generate your strategic topology!

## License
MIT
