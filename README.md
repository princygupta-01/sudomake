

# LetsStud - Multimodal Lecture Notes Generator

LetsStud converts YouTube lectures into structured study notes by combining


Students waste hours rewatching lectures to extract key concepts, formulas, and explanations.

This system automatically converts any lecture video into **structured, study-ready notes** by intelligently combining:

- 🎤 Spoken explanations (audio transcription)
- 👁️ Slide & board content (visual OCR)
- 📝 Subtitles (fallback reference)

All fused into one coherent, timestamp-aligned study document.

## 📝 Example Output

<img width="1920" height="1042" alt="image" src="https://github.com/user-attachments/assets/f7c005ba-e463-4fb8-aedd-4f21ddefa507" />


<img width="1920" height="1042" alt="image" src="https://github.com/user-attachments/assets/23e52f8b-92a2-4c4e-86c5-b38b69fc7501" />

<img width="1920" height="1042" alt="image" src="https://github.com/user-attachments/assets/46e4a683-ca30-4994-b062-67d0a615f2da" />

<img width="1920" height="1042" alt="image" src="https://github.com/user-attachments/assets/f4b6b0d3-8c31-455f-8489-5cabd6131a73" />

Current stack in this repo:

- Backend: FastAPI (`backend/main.py`)
- Frontend: Next.js 14 (`frontend`)

## What Is Implemented

- YouTube URL -> AI-generated notes
- Multimodal fusion (audio + visual OCR + subtitle fallback)
- Markdown-style long-form notes generation
- Local note saving in browser `localStorage`
- Download generated notes as `.txt` / `.pdf` from frontend
- Temporary media handling in backend pipeline cleanup helpers

## Current API (backend/main.py)

- `POST /analyze`
  - Body: `{ "youtube_url": "https://..." }`
  - Response: `{ "notes": "...generated notes..." }`

- `POST /download`
  - Body: `{ "notes": "...", "type": "txt" | "pdf" }`
  - Returns downloadable file response

## Project Structure

```text
letsStud/
+-- README.md
+-- backend/
�   +-- main.py
�   +-- pipeline.py
�   +-- requirements.txt
�   +-- .env
+-- frontend/
    +-- app/
    +-- components/
    +-- package.json
    +-- .env.local
    +-- ...
```

## Backend Setup (FastAPI)

### 1. Prerequisites

- Python 3.10+ recommended
- FFmpeg installed and available in PATH
- Google Gemini API key

### 2. Install

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Environment

Create `backend/.env`:

```env
GOOGLE_API_KEY=your_google_api_key
```

### 4. Run backend

```bash
uvicorn main:app --reload --port 8000
```

Backend base URL:

```text
http://localhost:8000
```

## Frontend Setup (Next.js)

### 1. Install

```bash
cd frontend
npm install
```

### 2. Environment

Create/update `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 3. Run frontend

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

## How It Works (Pipeline)

1. Extract/transcribe audio with Whisper
2. Extract frames from video
3. Detect scene/content changes (SSIM)
4. OCR on selected frames
5. Fetch subtitles as fallback
6. Fuse all sources by timestamp windows
7. Generate final notes with Gemini

## Notes About Current State

- Main backend entrypoint is `backend/main.py`.
- Primary frontend flow uses `POST /analyze`.
- Notes are stored locally in browser storage (not Firestore).
- Login/signup pages are present in UI, but the project currently works without authentication.

## Backend Dependencies (from requirements.txt)

- `fastapi`, `uvicorn`, `python-dotenv`
- `google-genai`
- `yt-dlp`, `openai-whisper`
- `opencv-python`, `easyocr`, `scikit-image`, `numpy==1.26.4`
- `sentence-transformers`, `faiss-cpu`
- `youtube-transcript-api`

## Troubleshooting

- `ffmpeg not found`
  - Install FFmpeg and verify with `ffmpeg -version`

- Gemini key error
  - Ensure `backend/.env` has valid `GOOGLE_API_KEY`

- Slow first run
  - Whisper/EasyOCR models may download on first execution

- CORS/API errors from frontend
  - Confirm backend is running on `http://localhost:8000`
  - Confirm `NEXT_PUBLIC_BACKEND_URL` matches backend URL

## Responsible Use

This tool is intended for personal learning and note-taking. Process only content you are authorized to use.

