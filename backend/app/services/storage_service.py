import uuid
import logging
from app.core.config import settings
from app.core.database import get_supabase

logger = logging.getLogger(__name__)


async def upload_file(file_bytes: bytes, filename: str, mime_type: str) -> str:
    """Upload file to Supabase Storage and return public URL."""
    try:
        db = get_supabase()
        file_id = str(uuid.uuid4())
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
        storage_path = f"{file_id}.{ext}"
        
        db.storage.from_(settings.SUPABASE_BUCKET).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": mime_type}
        )
        
        url_response = db.storage.from_(settings.SUPABASE_BUCKET).get_public_url(storage_path)
        return url_response
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise
