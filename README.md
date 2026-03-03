# 🎓 Multimodal AI Lecture Summarizer - LetsStud

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


---

## 🧠 Why Multimodal?

Most video summarizers rely only on transcripts.

That misses:
- Board derivations
- Slide formulas
- Written definitions
- Visual diagrams

This system combines:

- **Audio** → Explanations & conceptual flow  
- **Visual OCR** → Formulas, definitions, written content  
- **Subtitles** → Accuracy fallback  

Result: Notes that feel like they were written by a focused student — not a generic AI summary.

---

## ⚖️ Compliance & Responsible Design

This system is intentionally engineered to respect platform policies:

- ✅ Temporary in-memory media processing  
- ✅ No storage or redistribution of video content  
- ✅ Only derived, text-based outputs  
- ✅ User-initiated processing (no scraping automation)  
- ✅ Automatic deletion of media files after analysis  

This tool is designed strictly for personal learning and academic note-taking.

---

## 🏗️ Architecture Overview

```
YouTube Video
 ├── Audio Stream
 │    └── yt-dlp → Whisper → Timestamped Transcript
 │
 ├── Video Stream
 │    └── yt-dlp → OpenCV → Frame Extraction
 │         └── SSIM Change Detection → EasyOCR → Visual Text
 │
 └── Subtitles (Fallback)
      └── YouTubeTranscriptApi → Subtitle Text
              ↓
      Timestamp Alignment (5s windows)
              ↓
      Multimodal Fusion
              ↓
      Gemini LLM (Structured Generation)
              ↓
      Post-processing & Formatting
              ↓
      Structured Lecture Notes (Markdown)
```

---

## ✨ Core Capabilities

- 🎤 **Timestamped Whisper Transcription**
- 👁️ **OCR from Slides & Whiteboards**
- 🔍 **SSIM-based Scene Change Detection**
- 🔗 **Timestamp-Aligned Multimodal Fusion**
- 🤖 **Gemini-Powered Structured Notes**
- ⚙️ **Configurable Accuracy vs Speed**
- 📊 Real-time step-by-step processing feedback

---

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- FFmpeg (REQUIRED) → https://ffmpeg.org/download.html
- Google API Key → https://makersuite.google.com/app/apikey

---

### Installation

```bash
# 1. Activate virtual environment
venv\Scripts\activate     # Windows
# or
source venv/bin/activate  # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env file
# Add:
GOOGLE_API_KEY=your_api_key_here

# 4. Run the app
streamlit run app.py
```

Open:  
`http://localhost:8501`

---

## 📋 Requirements

```
streamlit
python-dotenv
google-generativeai
youtube-transcript-api
yt-dlp
opencv-python
easyocr
scikit-image
openai-whisper
numpy
```

---

## 🔬 Processing Pipeline

### 1️⃣ Audio Extraction
- Downloads audio stream
- Whisper generates timestamped transcript

### 2️⃣ Frame Extraction
- Extracts video frames at configurable intervals
- Uses SSIM to detect meaningful scene changes

### 3️⃣ OCR Processing
- Extracts formulas and written content
- Filters low-confidence detections
- Processes only changed frames (optimization)

### 4️⃣ Subtitle Fallback
- Fetches YouTube subtitles
- Used only when audio/visual is unclear

### 5️⃣ Multimodal Fusion
- Creates 5-second time windows
- Aligns audio, OCR, and subtitle data
- Ensures no information loss

### 6️⃣ Structured LLM Generation
Gemini prioritizes:

- Visual text → formulas & definitions
- Audio transcript → explanations
- Subtitles → fallback only

Output: Clean, structured Markdown notes.

---

## 🎯 Prioritization Logic

| Source | Used For |
|--------|----------|
| Visual OCR | Formulas, equations, definitions |
| Audio Transcript | Explanations, concepts |
| Subtitles | Missing or unclear content |

---

## ⚙️ Configuration Options

- Enable / Disable OCR
- Enable / Disable Subtitles
- Frame Interval (2–10 seconds)
  - Lower = More accurate, slower
  - Higher = Faster, may miss detail

---

## 📊 Performance Tips

- Faster → Increase frame interval (5–10s)
- Higher accuracy → Lower interval (2–3s)
- Lower memory → Disable OCR or increase interval
- First run → Expect model downloads (EasyOCR + Whisper)

---

## 📝 Example Output

The system generates:

- Clear headings & subheadings
- Bold key concepts
- Extracted formulas
- Timestamp references
- Complete lecture coverage

Structured Markdown output ready for:
- Study
- Revision
- Flashcards
- Export to PDF

---

## 💡 What Makes This Different

Unlike standard transcript summarizers:

- We extract board content using OCR.
- We detect scene changes intelligently (SSIM).
- We align multiple modalities by timestamp.
- We prioritize formulas from visual data over speech.

This produces academically usable notes — not generic summaries.

---

## 🎓 Use Cases

- Recorded lectures
- Tutorial videos
- Webinars
- Online courses
- Technical derivations
- Exam revision

---

## 🛠️ Project Structure

```
yt_transcriber_baseline/
├── app.py
├── requirements.txt
├── .env
└── README.md
```

---

## 🔮 Roadmap

- [ ] Topic-wise segmentation
- [ ] AI-generated quizzes
- [ ] PDF export
- [ ] FastAPI backend + modern frontend
- [ ] Batch video processing
- [ ] Study mode (flashcards)

---

## 🙏 Acknowledgments

- OpenAI Whisper
- EasyOCR
- Google Gemini
- Streamlit
- yt-dlp

---

## 📄 License

Educational use only.

---

Built with ❤️ for students who value structured understanding over passive watching.
