import asyncio
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse

from app.models.invoice import BatchUploadResponse, ProcessingResult, ProcessingStatus
from app.services.invoice_service import (
    create_invoice_record, process_invoice, get_invoice, list_invoices
)

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/tiff",
    "application/pdf"
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


@router.post("/upload", response_model=BatchUploadResponse)
async def upload_invoices(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
):
    """Upload one or more invoice files for processing."""
    if not files:
        raise HTTPException(400, "No files provided")
    if len(files) > 20:
        raise HTTPException(400, "Maximum 20 files per batch")
    
    batch_id = str(uuid.uuid4())
    invoice_ids = []
    failed = []
    
    for file in files:
        try:
            # Validate
            if file.content_type not in ALLOWED_TYPES:
                failed.append(f"{file.filename}: unsupported type {file.content_type}")
                continue
            
            contents = await file.read()
            if len(contents) > MAX_FILE_SIZE:
                failed.append(f"{file.filename}: file too large (max 20MB)")
                continue
            
            if len(contents) == 0:
                failed.append(f"{file.filename}: empty file")
                continue
            
            # Create DB record
            invoice_id = await create_invoice_record(
                file.filename, len(contents), file.content_type
            )
            invoice_ids.append(invoice_id)
            
            # Queue background processing
            background_tasks.add_task(
                process_invoice,
                invoice_id,
                contents,
                file.filename,
                file.content_type,
            )
            
        except Exception as e:
            logger.error(f"Upload error for {file.filename}: {e}")
            failed.append(f"{file.filename}: {str(e)}")
    
    return BatchUploadResponse(
        batch_id=batch_id,
        total_files=len(files),
        queued=len(invoice_ids),
        failed=failed,
        invoice_ids=invoice_ids,
    )


@router.get("/{invoice_id}", response_model=ProcessingResult)
async def get_invoice_status(invoice_id: str):
    """Get processing status and extracted data for an invoice."""
    invoice = await get_invoice(invoice_id)
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    
    return ProcessingResult(
        invoice_id=invoice_id,
        status=invoice["status"],
        data=invoice.get("extracted_data"),
        error=invoice.get("error_message"),
    )


@router.get("/", response_model=List[dict])
async def list_all_invoices(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all processed invoices."""
    return await list_invoices(limit=limit, offset=offset)


@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: str):
    """Delete an invoice record."""
    from app.core.database import get_supabase
    db = get_supabase()
    result = db.table("invoices").delete().eq("id", invoice_id).execute()
    if not result.data:
        raise HTTPException(404, "Invoice not found")
    return {"message": "Invoice deleted"}
