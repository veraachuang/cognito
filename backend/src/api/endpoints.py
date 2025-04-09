from fastapi import APIRouter
from pydantic import BaseModel
from backend.src.nlp_processing.preprocess import preprocess_text
from backend.src.models.writer_block_detector import detect_writer_block
from backend.src.models.writer_style_model import analyze_writing_style

router = APIRouter()

class TextRequest(BaseModel):
    text: str

@router.post("/preprocess/")
async def preprocess_text_api(data: TextRequest):
    cleaned_text = preprocess_text(data.text)
    return {"processed_text": cleaned_text}

@router.post("/detect-writer-block/")
async def detect_block(data: TextRequest):
    block_status = detect_writer_block(data.text)
    return {"writer_block_detected": block_status}

@router.post("/analyze-style/")
async def analyze_style(data: TextRequest):
    style = analyze_writing_style(data.text)
    return {"writing_style": style}
