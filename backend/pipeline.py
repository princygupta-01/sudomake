from dotenv import load_dotenv
import os
from google import genai
import whisper
import yt_dlp
import tempfile
import re
import numpy as np
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
import subprocess
import io
import urllib.request
import json
from fastapi import FastAPI
from pydantic import BaseModel

# RAG components (optional - only imported when needed)
try:
    from sentence_transformers import SentenceTransformer
    import faiss
    HAS_RAG = True
except ImportError:
    HAS_RAG = False

# Optional imports for OCR features (only imported when needed)
try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

try:
    from skimage.metrics import structural_similarity as ssim
    HAS_SCIKIT_IMAGE = True
except ImportError:
    HAS_SCIKIT_IMAGE = False

try:
    import easyocr
    HAS_EASYOCR = True
except ImportError:
    HAS_EASYOCR = False

# ---------------------------
# Load environment variables
# ---------------------------
load_dotenv()
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
# ---------------------------
# TOS-SAFE CLEANUP UTILITIES
# ---------------------------
def safe_delete_file(file_path):
    """Safely delete a file (TOS-safe cleanup)"""
    try:
        if file_path and os.path.exists(file_path):
            os.unlink(file_path)
            return True
    except Exception as e:
        # Log but don't fail - OS will clean up eventually
        print(f"Warning: Could not delete temp file {file_path}: {str(e)}")
    return False

def cleanup_temp_files(*file_paths):
    """Clean up multiple temporary files (TOS-safe)"""
    for file_path in file_paths:
        safe_delete_file(file_path)

# ---------------------------
# Prompt for Gemini AI (Multimodal)
# ---------------------------

# ---------------------------
# Prompt for Gemini AI (Multimodal)
# ---------------------------
def get_multimodal_prompt(summary_type="detailed"):
    """Get prompt template based on summary type (short or detailed)"""

    base_instructions = """
You are an expert teacher writing detailed handwritten-style notes for a student.

Your task is to transform multimodal lecture data (audio transcript, visual text from slides/board, and subtitles) into deeply explained, student-friendly study notes.

Writing Style Instructions:
- Write in clear, well-explained paragraphs.
- Explain each concept step-by-step.
- Add simple examples or analogies where helpful.
- Avoid bullet-only formatting.
- Do NOT write like presentation slides.
- Make it feel like a personal revision notebook.
- Prioritize deep understanding over short summaries.

Content Rules:
- Use visual text for formulas, equations, and definitions.
- Use audio transcript for explanations and conceptual clarity.
- Use subtitles only if audio or visual text is unclear.
- Ensure the notes are readable as a standalone study document.
"""

    if summary_type == "short":
        summary_instructions = """
5. Summary Type: SHORT OVERVIEW
    - Provide a concise explanation of the main ideas.
    - Focus only on core concepts and key formulas.
    - Keep explanations brief but clear.
    - Avoid detailed expansion.
"""
    else:  # detailed
        summary_instructions = """
5. Summary Type: DETAILED HANDWRITTEN NOTES
    - Create comprehensive, in-depth explanatory notes.
    - Preserve all important concepts, formulas, and definitions.
    - Expand explanations where needed for clarity.
    - Include examples if they improve understanding.
    - Avoid excessive bullet formatting.
    - Write in a natural, notebook-style flow.
    - Ensure the notes feel like they were written by a teacher for revision.
"""

    return base_instructions + summary_instructions + "\nMultimodal Data (timestamped chunks):\n\n"

# ---------------------------
# VIDEO ID EXTRACTION
# ---------------------------
def extract_video_id(youtube_url):
    patterns = [
        r"v=([a-zA-Z0-9_-]{11})",
        r"youtu\.be/([a-zA-Z0-9_-]{11})",
        r"shorts/([a-zA-Z0-9_-]{11})"
    ]
    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)
    return None


# ---------------------------
# SUBTITLE EXTRACTION (FALLBACK)
# ---------------------------
def get_subtitle_transcript_ytdlp(youtube_url, debug=False):
    """Extract subtitles using yt-dlp as fallback method"""
    try:
        if debug:
            print("🔄 Trying yt-dlp method for subtitles...")
        
        # Use yt-dlp to extract subtitle information
        ydl_opts = {
            'writesubtitles': True,
            'writeautomaticsub': True,  # Also get auto-generated subtitles
            'subtitleslangs': ['en', 'en-US', 'en-GB'],  # Prefer English
            'skip_download': True,  # We only want subtitles, not video
            'quiet': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            
            # Check for available subtitles
            subtitles = info.get('subtitles', {})
            automatic_captions = info.get('automatic_captions', {})
            
            if debug:
                print(f"  Available manual subtitles: {list(subtitles.keys())}")
                print(f"  Available auto-captions: {list(automatic_captions.keys())}")
            
            # Try to get English subtitles
            subtitle_data = None
            lang_used = None
            
            # Priority: en > en-US > en-GB > any English variant
            for lang in ['en', 'en-US', 'en-GB']:
                if lang in subtitles:
                    subtitle_data = subtitles[lang]
                    lang_used = lang
                    break
                elif lang in automatic_captions:
                    subtitle_data = automatic_captions[lang]
                    lang_used = f"{lang} (auto)"
                    break
            
            # If no English, try any available language
            if not subtitle_data:
                all_subs = {**subtitles, **automatic_captions}
                if all_subs:
                    lang_used = list(all_subs.keys())[0]
                    subtitle_data = all_subs[lang_used]
                    if debug:
                        print(f"  Using {lang_used} (no English available)")
            
            if not subtitle_data:
                if debug:
                    print("❌ No subtitles found via yt-dlp")
                return None
            
            # Get subtitle URL (handle both list and dict formats)
            subtitle_url = None
            if isinstance(subtitle_data, list) and len(subtitle_data) > 0:
                subtitle_url = subtitle_data[0].get('url')
            elif isinstance(subtitle_data, dict):
                subtitle_url = subtitle_data.get('url')
            
            if not subtitle_url:
                if debug:
                    print("❌ Could not get subtitle URL from yt-dlp")
                return None
            
            if debug:
                print(f"  Downloading subtitles from: {subtitle_url[:100]}...")
            
            # Download subtitle content
            try:
                with urllib.request.urlopen(subtitle_url) as response:
                    subtitle_content = response.read().decode('utf-8')
            except Exception as e:
                if debug:
                    print(f"❌ Failed to download subtitle content: {str(e)}")
                return None
            
            # Parse subtitle content (YouTube uses JSON format)
            try:
                subtitle_json = json.loads(subtitle_content)
                chunks = []
                
                # Handle YouTube's subtitle JSON format
                events = subtitle_json.get('events', [])
                for event in events:
                    if 'segs' in event:
                        text_parts = []
                        start_time = event.get('tStartMs', 0) / 1000.0  # Convert to seconds
                        duration = event.get('dDurationMs', 0) / 1000.0
                        
                        for seg in event['segs']:
                            if 'utf8' in seg:
                                text_parts.append(seg['utf8'])
                        
                        if text_parts:
                            full_text = " ".join(text_parts).strip()
                            if full_text:  # Only add non-empty text
                                chunks.append({
                                    "start": start_time,
                                    "end": start_time + duration,
                                    "text": full_text
                                })
                
                if debug:
                    print(f"✓ Extracted {len(chunks)} subtitle chunks using yt-dlp ({lang_used})")
                
                return chunks if chunks else None
                
            except json.JSONDecodeError as e:
                if debug:
                    print(f"❌ Subtitle content is not JSON format: {str(e)}")
                    print(f"  First 200 chars: {subtitle_content[:200]}")
                return None
            except Exception as e:
                if debug:
                    print(f"❌ Error parsing subtitle JSON: {str(e)}")
                return None
                
    except Exception as e:
        if debug:
            print(f"❌ yt-dlp subtitle extraction failed: {str(e)}")
            import traceback
            traceback.print_exc()
        return None

def get_subtitle_transcript(youtube_url, debug=False):
    """Extract subtitles as fallback reference - tries multiple methods
    
    Args:
        youtube_url: YouTube video URL
        debug: If True, show detailed debugging information
    """
    # Strategy 1: Try YouTube Transcript API (most reliable when it works)
    try:
        video_id = extract_video_id(youtube_url)
        if not video_id:
            if debug:
                print(f"❌ Could not extract video ID from URL: {youtube_url}")
            # Fall through to yt-dlp method
        else:
            if debug:
                print(f"🔍 Attempting to fetch subtitles for video ID: {video_id} (Method 1: YouTube Transcript API)")

            # Try multiple strategies to get subtitles
            # Strategy 1a: Try English subtitles (manual or auto-generated)
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
                if debug:
                    print(f"✓ Found English subtitles ({len(transcript_list)} segments)")
                
                # Convert to timestamped chunks
                chunks = []
                for item in transcript_list:
                    chunks.append({
                        "start": item['start'],
                        "end": item['start'] + item['duration'],
                        "text": item['text']
                    })
                
                if debug:
                    print(f"✓ Converted to {len(chunks)} timestamped chunks")
                
                return chunks
                
            except NoTranscriptFound:
                # Strategy 1b: Try auto-generated English
                try:
                    transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en-US', 'en-GB'])
                    if debug:
                        print(f"✓ Found auto-generated English subtitles ({len(transcript_list)} segments)")
                    
                    chunks = []
                    for item in transcript_list:
                        chunks.append({
                            "start": item['start'],
                            "end": item['start'] + item['duration'],
                            "text": item['text']
                        })
                    
                    return chunks
                    
                except NoTranscriptFound:
                    # Strategy 1c: List available languages and try first available
                    try:
                        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                        available_langs = []
                        for transcript in transcript_list:
                            lang_code = transcript.language_code
                            lang_name = transcript.language
                            available_langs.append(f"{lang_name} ({lang_code})")
                            # Try to fetch the first available transcript
                            try:
                                transcript_data = transcript.fetch()
                                if debug:
                                    print(f"✓ Found subtitles in {lang_name} ({len(transcript_data)} segments)")
                                
                                chunks = []
                                for item in transcript_data:
                                    chunks.append({
                                        "start": item['start'],
                                        "end": item['start'] + item['duration'],
                                        "text": item['text']
                                    })
                                
                                return chunks
                            except:
                                continue
                        
                        if debug:
                            print(f"❌ YouTube Transcript API: No accessible subtitles. Available: {', '.join(available_langs) if available_langs else 'None'}")
                    except Exception as e:
                        if debug:
                            print(f"❌ YouTube Transcript API error: {str(e)}")
            except TranscriptsDisabled:
                if debug:
                    print(f"❌ Subtitles are disabled for this video (YouTube Transcript API)")
            except Exception as e:
                if debug:
                    print(f"❌ YouTube Transcript API error: {str(e)}")
    
    except Exception as e:
        if debug:
            print(f"❌ YouTube Transcript API failed completely: {str(e)}")
    
    # Strategy 2: Fallback to yt-dlp method (often more reliable)
    if debug:
        print("\n🔄 Trying fallback method: yt-dlp...")
    
    ytdlp_result = get_subtitle_transcript_ytdlp(youtube_url, debug=debug)
    if ytdlp_result:
        return ytdlp_result
    
    # If both methods failed
    if debug:
        print("❌ All subtitle extraction methods failed")
    
    return None

# ---------------------------
# AUDIO EXTRACTION + WHISPER TRANSCRIPTION
# ---------------------------
# Initialize Whisper model once (singleton pattern for performance)
_whisper_model = None

def get_whisper_model():
    """Get or initialize Whisper model (singleton pattern)"""
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = whisper.load_model("base")
    return _whisper_model

def get_whisper_transcript_streaming(youtube_url):
    """Stream audio and transcribe using Whisper WITHOUT saving to disk"""
    # Get stream URL from yt-dlp without downloading
    ydl_opts = {
        "format": "bestaudio/best",
        "quiet": True,
        "noplaylist": True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            stream_url = info.get('url')
            if not stream_url:
                raise Exception("Could not extract stream URL")
    except Exception as e:
        raise Exception(f"Failed to get stream URL: {str(e)}")
    
    # Create a temporary pipe file that will be deleted immediately
    temp_audio = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_audio_path = temp_audio.name
    temp_audio.close()
    
    try:
        # Use FFmpeg to stream audio directly to temp file, then process immediately
        # This minimizes disk usage - file is deleted right after processing
        ffmpeg_cmd = [
            'ffmpeg',
            '-i', stream_url,
            '-vn',  # No video
            '-acodec', 'pcm_s16le',  # WAV format for Whisper
            '-ar', '16000',  # 16kHz sample rate (Whisper's preferred)
            '-ac', '1',  # Mono
            '-f', 'wav',
            '-y',  # Overwrite output file
            temp_audio_path
        ]
        
        # Run FFmpeg to stream and convert
        process = subprocess.run(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=600  # 10 minute timeout
        )
        
        if process.returncode != 0:
            raise Exception(f"FFmpeg failed: {process.stderr.decode()}")
        
        if not os.path.exists(temp_audio_path):
            raise Exception("FFmpeg did not create output file")
        
        # Load Whisper model (singleton pattern)
        model = get_whisper_model()
        
        # Transcribe immediately
        result = model.transcribe(temp_audio_path)
        
        # Extract timestamped chunks
        chunks = []
        for seg in result["segments"]:
            chunks.append({
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"]
            })
        
        return chunks
        
    finally:
        # TOS-Safe: Always delete temp file immediately after processing
        safe_delete_file(temp_audio_path)

def get_whisper_transcript(youtube_url, use_streaming=False):
    """Extract audio and transcribe using Whisper with timestamps
    
    Args:
        youtube_url: YouTube video URL
        use_streaming: If True, stream without saving full file (default: False)
    """
    if use_streaming:
        return get_whisper_transcript_streaming(youtube_url)
    
    # Original download-based method (fallback)
    # Create temp directory for audio file
    temp_dir = tempfile.gettempdir()
    temp_audio = tempfile.NamedTemporaryFile(suffix=".%(ext)s", dir=temp_dir, delete=False)
    audio_path_template = temp_audio.name
    temp_audio.close()

    # Strategy 1: Try downloading with post-processing
    audio_file = None
    downloaded_files = []  # Track all downloaded files for cleanup
    
    try:
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": audio_path_template,
            "quiet": True,
            "noplaylist": True,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
            }],
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
            audio_file = audio_path_template.replace(".%(ext)s", ".mp3")
            if os.path.exists(audio_file):
                downloaded_files.append(audio_file)
    except Exception as e:
        # Strategy 2: Download without post-processing (Whisper can handle various formats)
        try:
            ydl_opts = {
                "format": "bestaudio/best",
                "outtmpl": audio_path_template,
                "quiet": True,
                "noplaylist": True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=True)
                ext = info.get('ext', 'm4a')
                audio_file = audio_path_template.replace(".%(ext)s", f".{ext}")
                if os.path.exists(audio_file):
                    downloaded_files.append(audio_file)
        except Exception as e2:
            # TOS-Safe: Clean up any partially downloaded files before raising
            cleanup_temp_files(*downloaded_files)
            raise Exception(f"Failed to download audio. Error 1: {str(e)}. Error 2: {str(e2)}")

    # Verify file exists
    if not audio_file or not os.path.exists(audio_file):
        # Try to find the file with different extensions
        base_path = audio_path_template.replace(".%(ext)s", "")
        for ext in ['mp3', 'm4a', 'webm', 'opus', 'ogg']:
            test_path = base_path + "." + ext
            if os.path.exists(test_path):
                audio_file = test_path
                if audio_file not in downloaded_files:
                    downloaded_files.append(audio_file)
                break
        else:
            # TOS-Safe: Clean up before raising error
            cleanup_temp_files(*downloaded_files)
            raise Exception(f"Downloaded audio file not found")

    # Load Whisper model (singleton pattern)
    model = get_whisper_model()

    # Transcribe
    try:
        result = model.transcribe(audio_file)
    except Exception as e:
        # TOS-Safe: Clean up on transcription error
        cleanup_temp_files(*downloaded_files)
        raise

    # Extract timestamped chunks
    chunks = []
    for seg in result["segments"]:
        chunks.append({
            "start": seg["start"],
            "end": seg["end"],
            "text": seg["text"]
        })

    # TOS-Safe: Clean up temp files immediately after processing
    # Only delete actual downloaded files, not template strings
    cleanup_temp_files(*downloaded_files)

    return chunks

# ---------------------------
# VIDEO FRAME EXTRACTION
# ---------------------------
def extract_video_frames_scene_based_streaming(youtube_url, scene_threshold=30.0, min_interval=2.0):
    """Stream video frames and extract based on scene changes WITHOUT saving full video"""
    if not HAS_OPENCV:
        raise ImportError("OpenCV is required for video frame extraction. Install with: pip install opencv-python")
    
    # Get stream URL from yt-dlp without downloading
    ydl_opts = {
        "format": "best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]",
        "quiet": True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            stream_url = info.get('url')
            if not stream_url:
                raise Exception("Could not extract stream URL")
    except Exception as e:
        raise Exception(f"Failed to get stream URL: {str(e)}")
    
    # Open stream directly with OpenCV (if supported) or use FFmpeg pipe
    # Try direct URL first (works for some formats)
    cap = None
    try:
        cap = cv2.VideoCapture(stream_url)
        if not cap.isOpened():
            raise Exception("Could not open stream URL directly")
        
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0  # Default to 30 if unknown
        
        frames = []
        frame_count = 0
        prev_frame = None
        prev_timestamp = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            timestamp = frame_count / fps
            
            # Always include first frame
            if prev_frame is None:
                frames.append({
                    "timestamp": timestamp,
                    "frame": frame.copy()  # Copy to avoid reference issues
                })
                prev_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                prev_timestamp = timestamp
            else:
                # Convert to grayscale for comparison
                curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                
                # Calculate frame difference
                diff = cv2.absdiff(prev_frame, curr_gray)
                change_score = diff.mean()
                
                # Check if enough time has passed (min_interval) and scene changed
                time_since_last = timestamp - prev_timestamp
                
                if change_score > scene_threshold and time_since_last >= min_interval:
                    frames.append({
                        "timestamp": timestamp,
                        "frame": frame.copy()  # Copy to avoid reference issues
                    })
                    prev_frame = curr_gray
                    prev_timestamp = timestamp
            
            frame_count += 1
        
        return frames
    except Exception as e:
        # Fallback: Use temporary file method if streaming fails
        raise Exception(f"Streaming failed: {str(e)}. Falling back to download method.")
    finally:
        if cap is not None:
            cap.release()

def extract_video_frames_scene_based(youtube_url, scene_threshold=30.0, min_interval=2.0, use_streaming=False):
    """Extract frames based on scene changes (more efficient than fixed intervals)
    
    Args:
        youtube_url: YouTube video URL
        scene_threshold: Threshold for scene change detection
        min_interval: Minimum time between frames (seconds)
        use_streaming: If True, stream without saving full file (default: False)
    """
    if use_streaming:
        try:
            return extract_video_frames_scene_based_streaming(
                youtube_url, scene_threshold, min_interval
            )
        except Exception as e:
            # Fallback to download method if streaming fails
            print(f"⚠️ Streaming failed: {str(e)}. Using download method instead.")
    
    # Original download-based method (fallback)
    if not HAS_OPENCV:
        raise ImportError("OpenCV is required for video frame extraction. Install with: pip install opencv-python")
    
    # Create temp video file
    temp_video = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    video_path = temp_video.name
    temp_video.close()

    # yt-dlp options (video, medium quality for better OCR)
    # TOS-Safe: Avoid "worst" format to prevent any abuse arguments
    ydl_opts = {
        "format": "best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]",
        "outtmpl": video_path,
        "quiet": True,
    }

    # Download video
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
    except Exception as e:
        # TOS-Safe: Clean up on download error
        safe_delete_file(video_path)
        raise

    # Extract frames using scene-change detection
    cap = None
    try:
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0  # Fallback if FPS is missing
        if fps <= 0:
            fps = 30.0
        
        frames = []
        frame_count = 0
        prev_frame = None
        prev_timestamp = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            timestamp = frame_count / fps
            
            # Always include first frame
            if prev_frame is None:
                frames.append({
                    "timestamp": timestamp,
                    "frame": frame
                })
                prev_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                prev_timestamp = timestamp
            else:
                # Convert to grayscale for comparison
                curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                
                # Calculate frame difference
                diff = cv2.absdiff(prev_frame, curr_gray)
                change_score = diff.mean()
                
                # Check if enough time has passed (min_interval) and scene changed
                time_since_last = timestamp - prev_timestamp
                
                if change_score > scene_threshold and time_since_last >= min_interval:
                    frames.append({
                        "timestamp": timestamp,
                        "frame": frame
                    })
                    prev_frame = curr_gray
                    prev_timestamp = timestamp
            
            frame_count += 1
        
        return frames
    finally:
        # TOS-Critical: Always clean up video file, even on error
        if cap is not None:
            cap.release()
        safe_delete_file(video_path)

def extract_video_frames(youtube_url, frame_interval=3, use_scene_detection=True, use_streaming=False):
    """Extract frames - uses scene detection if enabled, otherwise fixed interval
    
    Args:
        youtube_url: YouTube video URL
        frame_interval: Interval between frames (seconds) - only used if use_scene_detection=False
        use_scene_detection: If True, use scene-change detection
        use_streaming: If True, stream without saving full file (default: False)
    """
    if use_scene_detection:
        return extract_video_frames_scene_based(youtube_url, use_streaming=use_streaming)
    else:
        # Fallback to original fixed-interval method
        if not HAS_OPENCV:
            raise ImportError("OpenCV is required for video frame extraction.")
        
        temp_video = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
        video_path = temp_video.name
        temp_video.close()

        # TOS-Safe: Avoid "worst" format to prevent any abuse arguments
        ydl_opts = {
            "format": "best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]",
            "outtmpl": video_path,
            "quiet": True,
        }

        # Download video
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([youtube_url])
        except Exception as e:
            # TOS-Safe: Clean up on download error
            safe_delete_file(video_path)
            raise

        cap = None
        try:
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0  # Fallback if FPS is missing
            if fps <= 0:
                fps = 30.0
            frame_skip = max(1, int(round(fps * frame_interval)))
            
            frames = []
            frame_count = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_count % frame_skip == 0:
                    timestamp = frame_count / fps
                    frames.append({
                        "timestamp": timestamp,
                        "frame": frame
                    })
                
                frame_count += 1
            
            return frames
        finally:
            # TOS-Critical: Always clean up video file, even on error
            if cap is not None:
                cap.release()
            safe_delete_file(video_path)


# ---------------------------
# VISUAL CONTENT CHANGE DETECTION
# ---------------------------
def detect_content_changes(frames, threshold=0.85):
    """Detect significant visual content changes using SSIM"""
    if not HAS_OPENCV or not HAS_SCIKIT_IMAGE:
        # Fallback: return all frames if dependencies missing
        return frames
    
    if len(frames) < 2:
        return frames
    
    changed_frames = [frames[0]]  # Always include first frame
    
    for i in range(1, len(frames)):
        prev_frame = cv2.cvtColor(frames[i-1]["frame"], cv2.COLOR_BGR2GRAY)
        curr_frame = cv2.cvtColor(frames[i]["frame"], cv2.COLOR_BGR2GRAY)
        
        # Resize for faster comparison
        prev_resized = cv2.resize(prev_frame, (320, 240))
        curr_resized = cv2.resize(curr_frame, (320, 240))
        
        # Calculate SSIM
        similarity = ssim(prev_resized, curr_resized)
        
        # If significantly different, include this frame
        if similarity < threshold:
            changed_frames.append(frames[i])
    
    return changed_frames


# ---------------------------
# OCR ON FRAMES (TEXT EXTRACTION)
# ---------------------------
# Initialize EasyOCR reader once (expensive operation)
_ocr_reader = None

def get_ocr_reader():
    """Get or initialize EasyOCR reader (singleton pattern)"""
    if not HAS_EASYOCR:
        raise ImportError("EasyOCR is required for OCR. Install with: pip install easyocr")
    
    global _ocr_reader
    if _ocr_reader is None:
        _ocr_reader = easyocr.Reader(['en'], gpu=False)
    return _ocr_reader

def preprocess_frame_for_ocr(frame):
    """Preprocess frame to improve OCR accuracy"""
    # Convert to grayscale for better OCR
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Enhance contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # Optional: Resize if frame is too small (OCR works better on larger text)
    height, width = enhanced.shape
    if height < 480:
        scale = 480 / height
        new_width = int(width * scale)
        enhanced = cv2.resize(enhanced, (new_width, 480), interpolation=cv2.INTER_CUBIC)
    
    # Convert back to BGR for EasyOCR (it expects BGR)
    enhanced_bgr = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
    
    return enhanced_bgr

def extract_visual_text(frames, debug=False):
    """Extract text from frames using EasyOCR
    
    Args:
        frames: List of frame dictionaries with 'frame' and 'timestamp' keys
        debug: If True, show detailed debugging information
    """
    if not HAS_EASYOCR:
        return []  # Return empty list if OCR not available
    
    reader = get_ocr_reader()
    
    visual_text_chunks = []
    processed_count = 0
    total_detections = 0
    low_confidence_count = 0
    
    for idx, frame_data in enumerate(frames):
        frame = frame_data["frame"]
        timestamp = frame_data["timestamp"]
        
        try:
            # Preprocess frame for better OCR
            processed_frame = preprocess_frame_for_ocr(frame)
            
            # Run OCR with detail=1 to get confidence scores (REQUIRED for filtering)
            # detail=0 returns only text strings, which breaks the unpacking below
            results = reader.readtext(
                processed_frame,
                paragraph=False,  # Get individual text blocks
                width_ths=0.7,    # Width threshold for text grouping
                height_ths=0.7,   # Height threshold for text grouping
                detail=1          # Get full details (bbox, text, confidence) - REQUIRED!
            )
            
            # Debug: Show actual result format
            if debug and len(results) > 0:
                print(f"  Frame {idx} @ {timestamp:.1f}s: First result format: type={type(results[0])}, len={len(results[0]) if isinstance(results[0], (tuple, list)) else 'N/A'}")
                print(f"    First result sample: {str(results[0])[:200]}")
            
            # Extract text with confidence threshold
            # EasyOCR returns: [(bbox, text, confidence), ...] where bbox is [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
            extracted_text = []
            for result in results:
                try:
                    # Handle different return formats robustly
                    text = None
                    confidence = 0.0
                    
                    # Format 1: Tuple/list with 3 elements: (bbox, text, confidence)
                    if isinstance(result, (tuple, list)) and len(result) >= 2:
                        # Use direct indexing to avoid unpacking issues
                        # bbox is first element (can be list of 4 points or other format)
                        # text is second element
                        # confidence is third element (if present)
                        if len(result) >= 3:
                            bbox = result[0]  # Don't unpack bbox, just assign
                            text = result[1]
                            confidence = result[2]
                        elif len(result) == 2:
                            # Some versions return (bbox, text) without confidence
                            bbox = result[0]
                            text = result[1]
                            confidence = 1.0  # Assume high confidence if not provided
                        else:
                            if debug:
                                print(f"  Frame {idx} @ {timestamp:.1f}s: Unexpected result format (len={len(result)}): {result}")
                            continue
                    
                    # Format 2: Just a string (when detail=0 or some edge cases)
                    elif isinstance(result, str):
                        text = result
                        confidence = 1.0  # Assume high confidence
                    
                    # Format 3: Dictionary format (less common)
                    elif isinstance(result, dict):
                        text = result.get('text', '')
                        confidence = result.get('confidence', 0.0)
                    
                    else:
                        if debug:
                            print(f"  Frame {idx} @ {timestamp:.1f}s: Unknown result format: {type(result)} - {result}")
                        continue
                    
                    # Validate text and confidence
                    if text is None or not isinstance(text, str):
                        if debug:
                            print(f"  Frame {idx} @ {timestamp:.1f}s: Invalid text: {text}")
                        continue
                    
                    # Ensure confidence is numeric
                    if not isinstance(confidence, (int, float)):
                        if debug:
                            print(f"  Frame {idx} @ {timestamp:.1f}s: Invalid confidence type: {type(confidence)} - {confidence}")
                        confidence = 0.0
                    
                    total_detections += 1
                    
                    # Lower threshold to catch more text (0.3 = 30% confidence)
                    if confidence > 0.3:
                        text_clean = text.strip()
                        if text_clean:  # Only add non-empty text
                            extracted_text.append(text_clean)
                    else:
                        low_confidence_count += 1
                        if debug:
                            print(f"  Frame {idx} @ {timestamp:.1f}s: Low confidence ({confidence:.2f}): '{text}'")
                            
                except Exception as e:
                    # Log the error but continue processing other results
                    if debug:
                        print(f"  Frame {idx} @ {timestamp:.1f}s: Error processing result {result}: {str(e)}")
                    continue
            
            if extracted_text:
                visual_text_chunks.append({
                    "timestamp": timestamp,
                    "visual_text": " ".join(extracted_text)
                })
                processed_count += 1
                if debug:
                    print(f"✓ Frame {idx} @ {timestamp:.1f}s: Extracted {len(extracted_text)} text blocks")
            elif debug:
                print(f"✗ Frame {idx} @ {timestamp:.1f}s: No text detected (total detections: {len(results)})")
                
        except Exception as e:
            # Continue processing other frames even if one fails
            error_msg = f"Warning: OCR failed on frame {idx} at {timestamp:.1f}s: {str(e)}"
            print(error_msg)
            if debug:
                import traceback
                traceback.print_exc()
            continue
    
    if debug:
        print(f"\n📊 OCR Summary:")
        print(f"  Total frames processed: {len(frames)}")
        print(f"  Frames with text: {processed_count}")
        print(f"  Total text detections: {total_detections}")
        print(f"  Low confidence (filtered): {low_confidence_count}")
    
    return visual_text_chunks


# ---------------------------
# MULTIMODAL FUSION (TIMESTAMP ALIGNMENT)
# ---------------------------
def fuse_multimodal_data(whisper_chunks, visual_text_chunks, subtitle_chunks=None, chunk_size=15.0):
    """Align and fuse audio, visual, and subtitle data by timestamp with better alignment"""
    # Get max timestamp
    max_time = 0
    if whisper_chunks:
        max_time = max([c["end"] for c in whisper_chunks])
    if visual_text_chunks:
        max_time = max(max_time, max([c["timestamp"] for c in visual_text_chunks]))
    if subtitle_chunks:
        max_time = max(max_time, max([c["end"] for c in subtitle_chunks]))
    
    # Create aligned chunks (10-20 second windows for RAG)
    fused_chunks = []
    
    current_time = 0
    while current_time < max_time:
        window_end = current_time + chunk_size
        
        # Get audio in this window (overlapping segments)
        audio_segments = []
        for chunk in whisper_chunks:
            # Include if any part overlaps with window
            if chunk["start"] < window_end and chunk["end"] > current_time:
                audio_segments.append({
                    "start": max(chunk["start"], current_time),
                    "end": min(chunk["end"], window_end),
                    "text": chunk["text"]
                })
        
        # Get visual text in this window
        visual_segments = []
        for chunk in visual_text_chunks:
            if current_time <= chunk["timestamp"] < window_end:
                visual_segments.append({
                    "timestamp": chunk["timestamp"],
                    "text": chunk["visual_text"]
                })
        
        # Get subtitle in this window
        subtitle_segments = []
        if subtitle_chunks:
            for chunk in subtitle_chunks:
                if chunk["start"] < window_end and chunk["end"] > current_time:
                    subtitle_segments.append({
                        "start": max(chunk["start"], current_time),
                        "end": min(chunk["end"], window_end),
                        "text": chunk["text"]
                    })
        
        # Combine all text sources
        audio_text = " ".join([seg["text"] for seg in audio_segments])
        visual_text = " ".join([seg["text"] for seg in visual_segments])
        subtitle_text = " ".join([seg["text"] for seg in subtitle_segments])
        
        # Create combined text for this chunk
        combined_text_parts = []
        if audio_text:
            combined_text_parts.append(f"[Audio] {audio_text}")
        if visual_text:
            combined_text_parts.append(f"[Visual] {visual_text}")
        if subtitle_text and not audio_text:  # Only use subtitle if audio missing
            combined_text_parts.append(f"[Subtitle] {subtitle_text}")
        
        combined_text = " ".join(combined_text_parts)
        
        # Create fused chunk with better structure
        if combined_text.strip():
            fused_chunks.append({
                "start": current_time,
                "end": window_end,
                "time_range": f"{int(current_time//60):02d}:{int(current_time%60):02d} - {int(window_end//60):02d}:{int(window_end%60):02d}",
                "audio": audio_text,
                "visual_text": visual_text,
                "subtitle": subtitle_text,
                "combined_text": combined_text,  # For RAG
                "audio_segments": audio_segments,
                "visual_segments": visual_segments
            })
        
        current_time += chunk_size
    
    return fused_chunks


# ---------------------------
# GENERATE SUMMARY USING GEMINI (MULTIMODAL)
# ---------------------------
def generate_multimodal_notes(fused_chunks, summary_type="detailed"):
    """Generate structured notes from multimodal data"""

    print("\n=== DEBUG: FUSED DATA SAMPLE ===")

    for chunk in fused_chunks[:2]:  # print first 2 chunks only
        print("Time:", chunk["time_range"])
        print("Audio:", (chunk["audio"][:150] if chunk["audio"] else "EMPTY"))
        print("Visual:", (chunk["visual_text"][:150] if chunk["visual_text"] else "EMPTY"))
        print("Subtitle:", (chunk["subtitle"][:150] if chunk["subtitle"] else "EMPTY"))
        print("-----")

    prompt = get_multimodal_prompt(summary_type)

    formatted_data = ""
    for chunk in fused_chunks:
        formatted_data += f"\n[Time: {chunk['time_range']}]\n"

        if chunk['audio']:
            formatted_data += f"Audio: {chunk['audio']}\n"

        if chunk['visual_text']:
            formatted_data += f"Visual Text: {chunk['visual_text']}\n"

        if chunk['subtitle']:
            formatted_data += f"Subtitle (fallback): {chunk['subtitle']}\n"

        formatted_data += "\n"

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt + formatted_data,
        config={
            "temperature": 0.2,
            "top_p": 0.9
        }
    )

    answer = response.text
    return answer
# ---------------------------
# POST-PROCESSING
# ---------------------------
def format_output(notes_text):
    """Post-process and format the output"""
    # Basic cleanup (can be enhanced)
    notes_text = notes_text.strip()
    return notes_text


# ---------------------------
# RAG SYSTEM FOR CHAT-WITH-VIDEO
# ---------------------------
# Initialize embedding model (singleton)
_embedding_model = None

def get_embedding_model():
    """Get or initialize sentence transformer model"""
    if not HAS_RAG:
        raise ImportError("RAG features require: pip install sentence-transformers faiss-cpu")
    
    global _embedding_model
    if _embedding_model is None:
        # Use lightweight model for speed
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _embedding_model

def create_video_embeddings(fused_chunks):
    """Create embeddings for video chunks for RAG
    
    Memory Note: Embeddings are stored in session state (ephemeral, in-memory only).
    They are automatically deleted when the Streamlit session ends.
    No persistent storage of video content or embeddings.
    """
    if not HAS_RAG:
        return None, None
    
    model = get_embedding_model()
    
    # Extract text from chunks
    texts = [chunk["combined_text"] for chunk in fused_chunks]
    
    # Generate embeddings
    embeddings = model.encode(texts, show_progress_bar=False)
    embeddings = np.array(embeddings).astype('float32')
    
    # Create FAISS index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)  # L2 distance
    index.add(embeddings)
    
    return index, fused_chunks

def search_video_chunks(query, index, chunks, top_k=5):
    """Search for relevant video chunks using vector similarity"""
    if not HAS_RAG or index is None:
        return []
    
    model = get_embedding_model()
    
    # Encode query
    query_embedding = model.encode([query])
    query_embedding = np.array(query_embedding).astype('float32')
    
    # Search
    distances, indices = index.search(query_embedding, top_k)
    
    # Return relevant chunks with scores
    results = []
    for i, idx in enumerate(indices[0]):
        if idx < len(chunks):
            results.append({
                "chunk": chunks[idx],
                "score": float(distances[0][i]),
                "rank": i + 1
            })
    
    return results

def answer_question_with_context(question, relevant_chunks, youtube_url=None):
    """Generate answer using LLM with retrieved context"""

    # Build context from relevant chunks
    context_parts = []
    for i, result in enumerate(relevant_chunks):
        chunk = result["chunk"]
        time_str = chunk["time_range"]
        text = chunk["combined_text"][:500]
        context_parts.append(f"[{time_str}] {text}")

    context = "\n\n".join(context_parts)

    # Create prompt
    prompt = f"""You are answering questions about a video lecture. Use ONLY the provided context from the video.
Cite specific timestamps when referencing information.

**CRITICAL INSTRUCTIONS:**
- Answer based ONLY on the provided context from the video
- If the answer is NOT present in the context, you MUST say: "I don't see this explained in the video."
- Do NOT make up information or use knowledge outside the video context
- Always cite timestamps when referencing specific information
- If you're uncertain, say so explicitly

Context from video:
{context}

Question: {question}

Answer (cite timestamps like [MM:SS]):"""

    # Generate answer
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    answer = response.text

    # Add clickable timestamps if YouTube URL provided
    if youtube_url:
        video_id = extract_video_id(youtube_url)
        if video_id:

            def make_timestamp_clickable(match):
                time_str = match.group(1)
                parts = time_str.split(":")

                if len(parts) == 2:
                    minutes, seconds = int(parts[0]), int(parts[1])
                    total_seconds = minutes * 60 + seconds
                elif len(parts) == 3:
                    hours, minutes, seconds = int(parts[0]), int(parts[1]), int(parts[2])
                    total_seconds = hours * 3600 + minutes * 60 + seconds
                else:
                    return match.group(0)

                url = f"https://www.youtube.com/watch?v={video_id}&t={total_seconds}s"
                return f"[{time_str}]({url})"

            answer = re.sub(
                r"\[(\d{1,2}:\d{2}(?::\d{2})?)\]",
                make_timestamp_clickable,
                answer
            )

    return answer





app = FastAPI()

class VideoRequest(BaseModel):
    youtube_url: str


@app.post("/generate-notes")
def generate_notes(request: VideoRequest):
    youtube_url = request.youtube_url

    whisper_chunks = get_whisper_transcript(youtube_url)
    frames = extract_video_frames(youtube_url)
    visual_chunks = extract_visual_text(frames)
    fused = fuse_multimodal_data(whisper_chunks, visual_chunks)

    notes = generate_multimodal_notes(fused)

    return {"notes": notes}
port = int(os.environ.get("PORT", 8501))
