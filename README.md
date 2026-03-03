# 🎓 Multimodal AI Lecture Summarizer

A production-grade system that analyzes **video, audio, visual text (slides/board), and subtitles** to generate comprehensive, structured lecture notes using multimodal AI fusion.

## ⚖️ Terms of Service Compliance

**This tool is designed to be TOS-safe:**

✅ **Temporary Processing Only** - All video/audio files are automatically deleted after analysis  
✅ **Text-Only Outputs** - Only generates summaries, transcripts, and notes (no media files)  
✅ **No Redistribution** - Does not store, host, or redistribute YouTube content  
✅ **Transformative Use** - Creates derived content (notes, summaries) for personal learning  
✅ **User-Provided URLs** - Only processes videos when users provide their own links  

**Important:** This tool is intended for personal learning and note-taking purposes. All media files are processed temporarily and deleted immediately after analysis. Only text-based derived content is generated.

---

## 🏗️ Architecture

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

## ✨ Features

- **🎤 Audio Transcription** - Whisper-based speech-to-text with timestamps
- **👁️ Visual Text Extraction** - OCR from slides, whiteboards, and handwritten content
- **🔍 Smart Frame Selection** - SSIM-based change detection to avoid duplicate OCR
- **📝 Subtitle Fallback** - YouTube subtitles as backup when audio/visual is unclear
- **🔗 Multimodal Fusion** - Timestamp-aligned combination of all data sources
- **🤖 LLM Summarization** - Gemini-powered structured note generation
- **⚙️ Configurable Processing** - Toggle features, adjust frame intervals
- **📊 Real-time Progress** - Step-by-step processing feedback

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+**
- **FFmpeg** (REQUIRED - install from [ffmpeg.org](https://ffmpeg.org/download.html))
- **Google API Key** (get from [Google AI Studio](https://makersuite.google.com/app/apikey))

### Installation

```bash
# 1. Activate virtual environment
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env file with your API key
# Create a file named .env and add:
# GOOGLE_API_KEY=your_actual_api_key_here

# 4. Run the app
streamlit run app.py
```

The app will open at `http://localhost:8501`

---

## 📋 Requirements

```
streamlit              # Web UI framework
python-dotenv          # Environment variables
google-generativeai    # Gemini LLM API
youtube-transcript-api # Subtitle extraction
yt-dlp                 # Video/audio download
opencv-python          # Video processing
easyocr                # OCR for visual text
scikit-image           # Image comparison (SSIM)
openai-whisper         # Audio transcription
numpy                  # Array operations
```

---

## 🎯 How It Works

### Processing Pipeline

1. **🎤 Audio Extraction** - Downloads audio, transcribes with Whisper (timestamped segments)
2. **📹 Frame Extraction** - Downloads video, extracts frames every N seconds (configurable)
3. **🔍 Change Detection** - Uses SSIM to identify significant visual content changes
4. **👁️ OCR Processing** - Extracts text from changed frames (formulas, definitions, slides)
5. **📝 Subtitle Fetching** - Retrieves YouTube subtitles as fallback reference
6. **🔗 Multimodal Fusion** - Aligns audio, visual, and subtitle data by timestamp (5s windows)
7. **🤖 LLM Generation** - Gemini creates structured notes prioritizing:
   - Visual text for formulas/definitions
   - Audio for explanations/concepts
   - Subtitles only when content is missing
8. **✅ Post-processing** - Formats output into clean Markdown notes

### Prioritization Logic

- **Visual Text** → Formulas, equations, definitions, written content
- **Audio Transcript** → Explanations, concepts, spoken narrative
- **Subtitles** → Fallback when audio/visual is unclear or missing

---

## ⚙️ Configuration

The sidebar allows you to:

- **Enable/Disable OCR** - Toggle visual text extraction
- **Enable/Disable Subtitles** - Toggle subtitle fallback
- **Frame Interval** - Adjust extraction frequency (2-10 seconds)
  - Lower = more frames = better accuracy but slower
  - Higher = fewer frames = faster but may miss content

---

## 🐛 Troubleshooting

### FFmpeg Not Found
**Solution:** Install FFmpeg and add to PATH. Verify with `ffmpeg -version`

### Module Not Found
**Solution:** Ensure virtual environment is activated and run `pip install -r requirements.txt`

### Out of Memory
**Solution:** Increase frame interval (5-10 seconds) or disable OCR

### EasyOCR Slow First Run
**Solution:** Normal - downloads ~500MB models on first use. Subsequent runs are faster.

### API Key Not Found
**Solution:** Check `.env` file exists in project root with correct `GOOGLE_API_KEY=...`

---

## 📊 Performance Tips

- **Faster Processing:** Increase frame interval (5-10 seconds)
- **Better Accuracy:** Lower frame interval (2-3 seconds) but expect slower processing
- **Lower Memory:** Increase frame interval OR disable OCR
- **First Run:** Expect 5-10 minutes for model downloads (EasyOCR + Whisper)

---

## 🎓 Use Cases

- **Lecture Videos** - Convert recorded lectures into study notes
- **Tutorial Videos** - Extract key concepts and formulas
- **Webinars** - Generate summaries with slide content
- **Educational Content** - Create comprehensive notes from video courses

---

## 🔬 Technical Details

### Frame Change Detection
- Uses **Structural Similarity Index (SSIM)** to compare consecutive frames
- Threshold: 0.85 (configurable)
- Only processes frames with significant content changes
- Reduces OCR computation by ~60-80%

### Timestamp Alignment
- Creates 5-second time windows
- Aligns audio segments, visual text, and subtitles
- Handles overlapping segments correctly
- Ensures no information loss during fusion

### OCR Optimization
- EasyOCR initialized once (singleton pattern)
- Confidence threshold: 0.5
- Processes only changed frames (not all frames)
- Supports printed and handwritten text

---

## 📝 Example Output

<img width="1920" height="1042" alt="image" src="https://github.com/user-attachments/assets/f7c005ba-e463-4fb8-aedd-4f21ddefa507" />


<img width="1920" height="1042" alt="image" src="https://github.com/user-attachments/assets/23e52f8b-92a2-4c4e-86c5-b38b69fc7501" />

<img width="1920" height="1042" alt="image" src="https://github.com/user-attachments/assets/46e4a683-ca30-4994-b062-67d0a615f2da" />

<img width="1920" height="1042" alt="image" src="https://github.com/user-attachments/assets/f4b6b0d3-8c31-455f-8489-5cabd6131a73" />

The system generates structured Markdown notes with:

- Clear headings and subheadings
- Bullet points for key concepts
- **Bold** formatting for important terms
- Formulas and equations from visual content
- Timestamps for major topic transitions
- Complete coverage of lecture content

---

## 🛠️ Development

### Project Structure

```
yt_transcriber_baseline/
├── app.py              # Main Streamlit application
├── requirements.txt    # Python dependencies
├── .env                # Environment variables (create this)
└── README.md          # This file
```

### Key Functions

- `get_whisper_transcript()` - Audio transcription with timestamps
- `extract_video_frames()` - Frame extraction from video
- `detect_content_changes()` - SSIM-based change detection
- `extract_visual_text()` - OCR text extraction
- `get_subtitle_transcript()` - Subtitle fallback
- `fuse_multimodal_data()` - Timestamp alignment and fusion
- `generate_multimodal_notes()` - LLM-powered note generation

---

## 📄 License

This project is for educational purposes.

---

## 🙏 Acknowledgments

- **OpenAI Whisper** - Audio transcription
- **EasyOCR** - Visual text extraction
- **Google Gemini** - LLM summarization
- **Streamlit** - Web interface framework

---

## 🔮 Future Enhancements
- [ ] multimodes of input
- [ ] Topic-wise segmentation
- [ ] Quiz generation from notes
- [ ] PDF export functionality
- [ ] FastAPI backend + Streamlit frontend
- [ ] Batch processing for multiple videos
- [ ] Custom model fine-tuning

---

**Built with ❤️ for students and educators**
