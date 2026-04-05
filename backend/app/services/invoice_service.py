import uuid
import logging
from typing import List
from datetime import datetime, timezone

from app.core.database import get_supabase
from app.services.ocr_service import extract_text
from app.services.llm_service import extract_invoice_data
from app.services.template_service import find_similar_template, save_format_template, check_duplicate
from app.services.storage_service import upload_file
from app.models.invoice import InvoiceRecord, ProcessingStatus, InvoiceData

logger = logging.getLogger(__name__)


async def create_invoice_record(filename: str, file_size: int, mime_type: str) -> str:
    """Create initial invoice record in DB and return its ID."""
    invoice_id = str(uuid.uuid4())
    db = get_supabase()
    
    db.table("invoices").insert({
        "id": invoice_id,
        "file_name": filename,
        "file_size": file_size,
        "mime_type": mime_type,
        "status": ProcessingStatus.PENDING.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    
    return invoice_id


async def process_invoice(
    invoice_id: str,
    file_bytes: bytes,
    filename: str,
    mime_type: str,
) -> InvoiceData:
    """
    Full pipeline: upload → OCR → LLM parse → validate → store.
    Updates DB status throughout.
    """
    db = get_supabase()
    
    def update_status(status: str, **kwargs):
        db.table("invoices").update({
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            **kwargs
        }).eq("id", invoice_id).execute()
    
    try:
        # 1. Upload to storage
        update_status(ProcessingStatus.PROCESSING.value)
        file_url = await upload_file(file_bytes, filename, mime_type)
        db.table("invoices").update({"file_url": file_url}).eq("id", invoice_id).execute()
        
        # 2. OCR
        logger.info(f"[{invoice_id}] Starting OCR extraction")
        ocr_text = await extract_text(file_bytes, mime_type)
        
        if not ocr_text or len(ocr_text.strip()) < 10:
            raise ValueError("OCR produced insufficient text. Document may be blank or unreadable.")
        
        # 3. Check for similar format template
        template_id, template_hint = await find_similar_template(ocr_text)
        
        # 4. LLM parsing
        logger.info(f"[{invoice_id}] Starting LLM extraction")
        invoice_data, confidence = await extract_invoice_data(ocr_text, template_hint or "")
        invoice_data.format_template_id = template_id
        
        # 5. Duplicate detection
        data_dict = invoice_data.dict()
        is_duplicate, duplicate_of = await check_duplicate(data_dict)
        
        # 6. Save template if new format
        if not template_id and confidence > 0.6:
            await save_format_template(ocr_text, data_dict, invoice_id)
        
        # 7. Update DB with results
        update_status(
            ProcessingStatus.COMPLETED.value,
            extracted_data=data_dict,
            raw_ocr_text=ocr_text[:5000],  # Store first 5k chars
            is_duplicate=is_duplicate,
            duplicate_of=duplicate_of,
        )
        
        logger.info(f"[{invoice_id}] Processing complete. Confidence: {confidence:.2f}")
        return invoice_data
        
    except Exception as e:
        logger.error(f"[{invoice_id}] Processing failed: {e}")
        update_status(
            ProcessingStatus.FAILED.value,
            error_message=str(e)[:500]
        )
        raise


async def get_invoice(invoice_id: str) -> dict:
    db = get_supabase()
    result = db.table("invoices").select("*").eq("id", invoice_id).single().execute()
    return result.data


async def list_invoices(limit: int = 50, offset: int = 0) -> List[dict]:
    db = get_supabase()
    result = db.table("invoices").select("*").order(
        "created_at", desc=True
    ).range(offset, offset + limit - 1).execute()
    return result.data or []
