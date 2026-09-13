from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel
import tempfile, os

app = FastAPI()
model = WhisperModel("small", device="cpu", compute_type="int8")  # loaded once at startup

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        segments, _ = model.transcribe(tmp_path)
        result = [{"text": seg.text, "start": seg.start, "duration": seg.end - seg.start} for seg in segments]
    except Exception:
        # a trailing/truncated chunk (e.g. the final one on stop()) can be an
        # unparseable partial webm container - treat it as silence, not an error
        result = []
    finally:
        os.remove(tmp_path)
    return result

@app.get("/health")
def health():
    return {"status": "ok"}
