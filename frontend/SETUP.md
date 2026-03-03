# 🚀 Quick Setup Guide - LetsStud

## Environment Configuration Required

Your LetsStud application is built and running! Before you can test the AI features, you need to configure the environment variables.

### Step 1: Update Environment Variables

Edit the `/app/.env` file and add your credentials:

```env
# Replace these placeholder values with your actual credentials:

# Emergent LLM Key (for OpenAI Whisper & Gemini)
EMERGENT_LLM_KEY=sk-emergent-bD16b55EaF0259f56A

# Firebase Firestore Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### Step 2: Set Up Firebase Firestore

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Create Project**: Click "Add project" or use existing
3. **Enable Firestore**:
   - Click "Firestore Database" in sidebar
   - Click "Create database"
   - Select "Start in **test mode**" (important for MVP)
   - Choose location (e.g., us-central)
   - Click "Enable"

4. **Get Configuration**:
   - Click ⚙️ (Settings) → "Project settings"
   - Scroll to "Your apps" section
   - Click Web icon (</>)
   - Copy the config values to your `.env` file

### Step 3: Restart the Server

After updating `.env`, restart the Next.js server:

```bash
sudo supervisorctl restart nextjs
```

Or if you're developing locally:
```bash
yarn dev
```

### Step 4: Test the Application

Visit your application at:
- **Local**: http://localhost:3000
- **Production**: Check your NEXT_PUBLIC_BASE_URL

### Step 5: Verify Everything Works

1. **Test Text Processing**:
   - Go to Upload tab
   - Paste some text
   - Click "Generate Summary"
   - You should see 4 different summary formats

2. **Save a Note**:
   - After processing, click "Save to Notes"
   - Go to "My Notes" tab
   - Your note should appear

3. **Test Search**:
   - Enter a search term
   - Click "Search"
   - Results should filter

## What You Have

### ✅ Frontend Features
- Beautiful UI with gradient design
- Multi-format file upload (Audio, Video, PDF, Text)
- Text paste functionality
- Real-time processing indicators
- 4 AI-generated summary formats display
- Notes gallery with search and delete
- Responsive design
- Toast notifications

### ✅ Backend Features
- File processing (in-memory only, no storage costs)
- OpenAI Whisper transcription for audio/video
- Gemini 2.0 summarization (4 formats)
- Firestore database integration
- PDF text extraction
- Search functionality
- Full CRUD operations for notes

### ✅ AI Capabilities
- **Speech-to-Text**: Accurate transcription with Whisper
- **4 Summary Types**:
  1. Bullet-point notes
  2. Topic-wise structured format
  3. Key takeaways
  4. Q&A for revision

## File Processing Supported

| Type | Formats | AI Processing |
|------|---------|--------------|
| Audio | MP3, WAV, AAC, etc. | Whisper → Gemini |
| Video | MP4, MOV, AVI, etc. | Whisper → Gemini |
| PDF | PDF documents | Text extraction → Gemini |
| Text | TXT, plain text | Direct → Gemini |

## Important Notes

### Security
- Files are processed **in-memory only**
- No files are stored (cost-free, secure)
- Firestore is in **test mode** (for development)
- For production: Add authentication + security rules

### Limitations
- YouTube processing: Placeholder (future feature)
- File size: Limited by Whisper API (25MB max)
- Language: English only (current)
- No user authentication (MVP)

### Costs
- **Firebase Firestore**: Free tier (generous limits)
- **OpenAI Whisper**: Pay per minute of audio
- **Google Gemini**: Free tier available
- **No file storage costs**: Everything in-memory

## Troubleshooting

### "Firebase is not defined" Error
- Make sure all Firebase env vars are set in `.env`
- Restart the server after updating `.env`

### "API key invalid" Error
- Verify EMERGENT_LLM_KEY is correct
- Check if key has access to OpenAI and Gemini

### Transcription Fails
- Check file size (Whisper limit: 25MB)
- Verify audio format is supported
- Check API key permissions

### Firestore Permission Denied
- Make sure Firestore is in "test mode"
- Check Firebase project is active
- Verify project ID matches .env

## Need Help?

Check the detailed documentation in `README.md` for:
- Complete API documentation
- Architecture details
- Deployment instructions
- Advanced features

---

**Ready to test?** Configure your environment variables and start creating smart notes! 🧠✨

