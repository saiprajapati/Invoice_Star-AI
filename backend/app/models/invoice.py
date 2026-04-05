from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class LineItem(BaseModel):
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    total: Optional[float] = None
    tax_rate: Optional[float] = None


class InvoiceData(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_address: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_phone: Optional[str] = None
    vendor_tax_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_address: Optional[str] = None
    line_items: Optional[List[LineItem]] = []
    subtotal: Optional[float] = None
    tax_amount: Optional[float] = None
    discount: Optional[float] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = "USD"
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    confidence_score: Optional[float] = None
    format_template_id: Optional[str] = None


class InvoiceRecord(BaseModel):
    id: Optional[str] = None
    file_name: str
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    status: ProcessingStatus = ProcessingStatus.PENDING
    extracted_data: Optional[InvoiceData] = None
    raw_ocr_text: Optional[str] = None
    error_message: Optional[str] = None
    is_duplicate: Optional[bool] = False
    duplicate_of: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class BatchUploadResponse(BaseModel):
    batch_id: str
    total_files: int
    queued: int
    failed: List[str] = []
    invoice_ids: List[str] = []


class ProcessingResult(BaseModel):
    invoice_id: str
    status: ProcessingStatus
    data: Optional[InvoiceData] = None
    error: Optional[str] = None
