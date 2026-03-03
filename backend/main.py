from fastapi import FastAPI
from fastapi import Response
import io
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pipeline import (
    get_whisper_transcript,
    extract_video_frames,
    extract_visual_text,
    fuse_multimodal_data,
    generate_multimodal_notes
)

app = FastAPI(title="YouTube Multimodal Backend")

# ✅ ADD THIS BLOCK
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    youtube_url: str


@app.post("/analyze")
def generate_notes(request: VideoRequest):
    youtube_url = request.youtube_url

    whisper_chunks = get_whisper_transcript(youtube_url)
    frames = extract_video_frames(youtube_url)
    visual_chunks = extract_visual_text(frames)
    fused = fuse_multimodal_data(whisper_chunks, visual_chunks)

    notes = generate_multimodal_notes(fused)

    return {"notes": notes}

    


@app.post("/download")
def download_notes(data: dict):
    notes = data.get("notes", "")
    file_type = data.get("type", "txt")

    if file_type == "txt":
        return Response(
            content=notes,
            media_type="text/plain",
            headers={
                "Content-Disposition": "attachment; filename=letsstud_notes.txt"
            },
        )

    elif file_type == "pdf":
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer)
        styles = getSampleStyleSheet()
        elements = []

        for line in notes.split("\n"):
            elements.append(Paragraph(line, styles["Normal"]))
            elements.append(Spacer(1, 0.2 * inch))

        doc.build(elements)

        pdf = buffer.getvalue()
        buffer.close()

        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=letsstud_notes.pdf"
            },
        )