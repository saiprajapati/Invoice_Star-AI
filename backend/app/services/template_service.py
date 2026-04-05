import hashlib
import json
import logging
from typing import Optional, Tuple
from app.core.database import get_supabase

logger = logging.getLogger(__name__)

# Key structural indicators to detect format similarity
FORMAT_INDICATORS = [
    "invoice", "bill", "receipt", "tax invoice",
    "purchase order", "statement", "credit note"
]


def extract_format_signature(ocr_text: str) -> dict:
    """
    Extract structural fingerprint from OCR text.
    Used to detect if we've seen this invoice format before.
    """
    text_lower = ocr_text.lower()
    lines = [l.strip() for l in ocr_text.split('\n') if l.strip()]
    
    # Detect structural keywords present
    keywords_found = [kw for kw in [
        "invoice no", "invoice #", "bill to", "ship to", "date", "due date",
        "quantity", "qty", "unit price", "amount", "subtotal", "total",
        "tax", "gst", "vat", "payment terms", "po number"
    ] if kw in text_lower]
    
    # Rough layout type
    has_table = any(c in ocr_text for c in ['|', '\t\t'])
    line_count = len(lines)
    avg_line_len = sum(len(l) for l in lines) / max(len(lines), 1)
    
    return {
        "keywords": sorted(keywords_found),
        "has_table": has_table,
        "line_density": "dense" if line_count > 40 else "medium" if line_count > 20 else "sparse",
        "avg_line_length": round(avg_line_len / 10) * 10,  # bucket to nearest 10
    }


def signature_to_hash(signature: dict) -> str:
    sig_str = json.dumps(signature, sort_keys=True)
    return hashlib.sha256(sig_str.encode()).hexdigest()[:16]


async def find_similar_template(ocr_text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Check if a similar invoice format has been processed before.
    Returns (template_id, template_hint) or (None, None).
    """
    try:
        sig = extract_format_signature(ocr_text)
        sig_hash = signature_to_hash(sig)
        
        db = get_supabase()
        result = db.table("format_templates").select("*").eq("signature_hash", sig_hash).limit(1).execute()
        
        if result.data:
            template = result.data[0]
            logger.info(f"Found matching format template: {template['id']}")
            hint = f"TEMPLATE HINT: This invoice matches a previously seen format. Known fields layout: {template.get('field_hints', '')}"
            return template["id"], hint
    except Exception as e:
        logger.warning(f"Template lookup failed: {e}")
    
    return None, None


async def save_format_template(ocr_text: str, invoice_data: dict, invoice_id: str):
    """Save a new format template for future reuse."""
    try:
        sig = extract_format_signature(ocr_text)
        sig_hash = signature_to_hash(sig)
        
        # Build field hints from successfully extracted data
        field_hints = []
        for field in ["vendor_name", "invoice_number", "total_amount", "currency"]:
            if invoice_data.get(field):
                field_hints.append(field)
        
        db = get_supabase()
        # Upsert template
        db.table("format_templates").upsert({
            "signature_hash": sig_hash,
            "signature": sig,
            "field_hints": ", ".join(field_hints),
            "sample_invoice_id": invoice_id,
            "use_count": 1,
        }).execute()
        
        logger.info(f"Saved format template with hash: {sig_hash}")
    except Exception as e:
        logger.warning(f"Failed to save format template: {e}")


async def check_duplicate(invoice_data: dict) -> Tuple[bool, Optional[str]]:
    """
    Check if this invoice is a duplicate based on invoice_number + vendor_name.
    Returns (is_duplicate, original_invoice_id).
    """
    invoice_number = invoice_data.get("invoice_number")
    vendor_name = invoice_data.get("vendor_name")
    
    if not invoice_number or not vendor_name:
        return False, None
    
    try:
        db = get_supabase()
        result = db.table("invoices").select("id").eq(
            "extracted_data->>invoice_number", invoice_number
        ).eq(
            "extracted_data->>vendor_name", vendor_name
        ).eq("status", "completed").limit(1).execute()
        
        if result.data:
            return True, result.data[0]["id"]
    except Exception as e:
        logger.warning(f"Duplicate check failed: {e}")
    
    return False, None
