import io
import base64
from typing import Optional
import logging

logger = logging.getLogger(__name__)


async def extract_text_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    """Extract text from image using Tesseract OCR."""
    try:
        import pytesseract
        from PIL import Image
        
        image = Image.open(io.BytesIO(image_bytes))
        # Preprocess: convert to grayscale for better OCR
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        text = pytesseract.image_to_string(image, config='--psm 6')
        return text.strip()
    except ImportError:
        logger.warning("pytesseract not available, returning placeholder")
        return "[OCR_PLACEHOLDER: Install pytesseract for text extraction]"
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        raise


async def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF, using pdfplumber first, then OCR as fallback."""
    text_parts = []
    
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        
        if text_parts:
            combined = "\n\n".join(text_parts)
            if len(combined.strip()) > 50:  # Meaningful text found
                return combined
    except Exception as e:
        logger.warning(f"pdfplumber extraction failed: {e}")

    # Fallback to OCR via pdf2image
    try:
        from pdf2image import convert_from_bytes
        images = convert_from_bytes(pdf_bytes, dpi=200)
        for img in images:
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            page_text = await extract_text_from_image(buf.getvalue(), "image/png")
            if page_text:
                text_parts.append(page_text)
        return "\n\n".join(text_parts)
    except Exception as e:
        logger.error(f"PDF OCR fallback failed: {e}")
        raise


async def extract_text(file_bytes: bytes, mime_type: str) -> str:
    """Main entry point for text extraction."""
    if mime_type == "application/pdf":
        return await extract_text_from_pdf(file_bytes)
    elif mime_type in ["image/jpeg", "image/png", "image/tiff", "image/webp"]:
        return await extract_text_from_image(file_bytes, mime_type)
    else:
        raise ValueError(f"Unsupported file type: {mime_type}")
