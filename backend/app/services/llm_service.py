import json
import logging
from typing import Optional, Tuple
from app.core.config import settings
from app.models.invoice import InvoiceData, LineItem

logger = logging.getLogger(__name__)

EXTRACTION_SYSTEM_PROMPT = """You are an expert invoice data extraction AI. Your task is to extract structured data from OCR text of invoice documents.

RULES:
1. Extract ALL available fields. If a field is not present, use null.
2. Normalize vendor names (e.g., "AMAZON.COM" → "Amazon", "APPLE INC." → "Apple")
3. Standardize dates to ISO format (YYYY-MM-DD) when possible
4. Currency: detect from symbols ($=USD, €=EUR, £=GBP, ₹=INR, etc.)
5. Amounts: return as floats, no currency symbols or commas
6. For line items: extract each product/service individually
7. Calculate confidence_score (0.0-1.0) based on how complete and clear the extraction is
8. If OCR text is noisy/garbled, do your best to interpret context

RESPOND ONLY WITH VALID JSON. No explanation, no markdown, no extra text."""

EXTRACTION_USER_TEMPLATE = """Extract all invoice data from the following OCR text.

OCR TEXT:
{ocr_text}

{template_hint}

Return a JSON object with these fields:
{{
  "invoice_number": string or null,
  "invoice_date": string (YYYY-MM-DD) or null,
  "due_date": string (YYYY-MM-DD) or null,
  "vendor_name": string or null,
  "vendor_address": string or null,
  "vendor_email": string or null,
  "vendor_phone": string or null,
  "vendor_tax_id": string or null,
  "customer_name": string or null,
  "customer_address": string or null,
  "line_items": [
    {{
      "description": string,
      "quantity": float or null,
      "unit_price": float or null,
      "total": float or null,
      "tax_rate": float or null
    }}
  ],
  "subtotal": float or null,
  "tax_amount": float or null,
  "discount": float or null,
  "total_amount": float or null,
  "currency": string (3-letter ISO code),
  "payment_terms": string or null,
  "notes": string or null,
  "confidence_score": float (0.0-1.0)
}}"""


async def parse_with_openai(ocr_text: str, template_hint: str = "") -> dict:
    """Parse invoice text using OpenAI."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    prompt = EXTRACTION_USER_TEMPLATE.format(
        ocr_text=ocr_text,
        template_hint=template_hint
    )
    
    response = await client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
        max_tokens=2000,
    )
    
    return json.loads(response.choices[0].message.content)


async def parse_with_gemini(ocr_text: str, template_hint: str = "") -> dict:
    """Parse invoice text using Google Gemini."""
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-pro')
    
    prompt = f"{EXTRACTION_SYSTEM_PROMPT}\n\n{EXTRACTION_USER_TEMPLATE.format(ocr_text=ocr_text, template_hint=template_hint)}"
    
    response = await model.generate_content_async(
        prompt,
        generation_config={"temperature": 0.1, "max_output_tokens": 2000}
    )
    
    text = response.text.strip()
    # Strip markdown if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


async def extract_invoice_data(ocr_text: str, template_hint: str = "") -> Tuple[InvoiceData, float]:
    """
    Main entry: parse OCR text into structured invoice data.
    Returns (InvoiceData, confidence_score).
    Tries primary LLM, falls back to secondary on failure.
    """
    raw_data = None
    
    providers = []
    if settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        providers.append(("openai", parse_with_openai))
    if settings.GEMINI_API_KEY:
        providers.append(("gemini", parse_with_gemini))
    if settings.LLM_PROVIDER == "openai" and not providers:
        # No keys configured - return demo data
        return _demo_extraction(ocr_text), 0.5

    for provider_name, parser_fn in providers:
        try:
            logger.info(f"Trying LLM provider: {provider_name}")
            raw_data = await parser_fn(ocr_text, template_hint)
            break
        except Exception as e:
            logger.warning(f"Provider {provider_name} failed: {e}")
            continue

    if raw_data is None:
        raise RuntimeError("All LLM providers failed")

    return _dict_to_invoice_data(raw_data)


def _dict_to_invoice_data(raw: dict) -> Tuple[InvoiceData, float]:
    """Convert raw dict to InvoiceData model with validation."""
    line_items = []
    for item in raw.get("line_items", []) or []:
        try:
            line_items.append(LineItem(
                description=item.get("description"),
                quantity=_safe_float(item.get("quantity")),
                unit_price=_safe_float(item.get("unit_price")),
                total=_safe_float(item.get("total")),
                tax_rate=_safe_float(item.get("tax_rate")),
            ))
        except Exception:
            pass

    confidence = _safe_float(raw.get("confidence_score")) or 0.7
    
    data = InvoiceData(
        invoice_number=raw.get("invoice_number"),
        invoice_date=raw.get("invoice_date"),
        due_date=raw.get("due_date"),
        vendor_name=raw.get("vendor_name"),
        vendor_address=raw.get("vendor_address"),
        vendor_email=raw.get("vendor_email"),
        vendor_phone=raw.get("vendor_phone"),
        vendor_tax_id=raw.get("vendor_tax_id"),
        customer_name=raw.get("customer_name"),
        customer_address=raw.get("customer_address"),
        line_items=line_items,
        subtotal=_safe_float(raw.get("subtotal")),
        tax_amount=_safe_float(raw.get("tax_amount")),
        discount=_safe_float(raw.get("discount")),
        total_amount=_safe_float(raw.get("total_amount")),
        currency=raw.get("currency") or "USD",
        payment_terms=raw.get("payment_terms"),
        notes=raw.get("notes"),
        confidence_score=confidence,
    )
    return data, confidence


def _safe_float(value) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(str(value).replace(",", "").replace("$", "").strip())
    except (ValueError, TypeError):
        return None


def _demo_extraction(ocr_text: str) -> InvoiceData:
    """Return a demo extraction when no LLM is configured."""
    return InvoiceData(
        invoice_number="DEMO-001",
        invoice_date="2024-01-15",
        vendor_name="Demo Vendor Inc.",
        total_amount=1500.00,
        currency="USD",
        confidence_score=0.5,
        notes="Demo mode: Configure OPENAI_API_KEY or GEMINI_API_KEY for real extraction"
    )
