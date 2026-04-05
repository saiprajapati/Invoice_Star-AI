from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "llm_provider": settings.LLM_PROVIDER,
        "ocr_provider": settings.OCR_PROVIDER,
        "supabase_configured": bool(settings.SUPABASE_URL),
        "llm_configured": bool(settings.OPENAI_API_KEY or settings.GEMINI_API_KEY),
    }
