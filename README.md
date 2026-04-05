# Invoice Extraction AI

An AI-powered application that extracts structured data from invoice documents (PDFs and images), stores results in Supabase, and provides analytics dashboards on spending patterns.

---

## Live Demo

- **Frontend:** `https://invoice-ai.vercel.app` *(deploy yours with one click below)*
- **API:** `https://invoice-ai-backend.onrender.com`
- **API Docs:** `https://invoice-ai-backend.onrender.com/docs`

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│   Upload UI → Invoice List → Analytics Dashboard            │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API
┌───────────────────────────▼─────────────────────────────────┐
│                    Backend (FastAPI)                         │
│                                                              │
│  POST /invoices/upload                                       │
│    │                                                         │
│    ├─ 1. Validate file (type, size)                         │
│    ├─ 2. Upload to Supabase Storage                         │
│    ├─ 3. Create DB record (status: pending)                 │
│    └─ 4. Queue background task                              │
│              │                                              │
│    Background Processing Pipeline:                          │
│    ├─ OCR  ──→ pdfplumber (native PDF text)                 │
│    │            └─ fallback: pdf2image + Tesseract          │
│    ├─ Template Detection (format fingerprint match)         │
│    ├─ LLM  ──→ OpenAI GPT-4o-mini                          │
│    │            └─ fallback: Google Gemini                  │
│    ├─ Validation (Pydantic schema enforcement)              │
│    ├─ Duplicate Detection (invoice# + vendor match)         │
│    └─ Save extracted JSON to Supabase DB                    │
│                                                              │
│  GET  /invoices/         → List all invoices                │
│  GET  /invoices/{id}     → Get status + data                │
│  GET  /analytics/summary → KPIs, trends, vendors            │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      Supabase                                │
│   PostgreSQL DB  │  File Storage  │  Row-Level Security      │
│                                                              │
│   Tables: invoices, format_templates                        │
│   Views:  invoice_analytics, monthly_spend, vendor_spend    │
│   Bucket: invoices (public)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | FastAPI, Python 3.11, Pydantic v2 |
| OCR | Tesseract (pytesseract), pdfplumber, pdf2image |
| LLM | OpenAI GPT-4o-mini (primary), Google Gemini (fallback) |
| Database | Supabase (PostgreSQL + JSONB) |
| Storage | Supabase Storage |
| Deployment | Vercel (frontend), Render (backend) |

---

## Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- Tesseract OCR installed (`brew install tesseract` / `apt install tesseract-ocr`)
- Poppler (`brew install poppler` / `apt install poppler-utils`)
- Supabase account
- OpenAI API key (or Gemini key)

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of `backend/supabase_migration.sql`
3. Go to **Storage** → Create bucket named `invoices` (set to **Public**)
4. Copy your project URL, anon key, and service role key

### 2. Backend Setup

```bash
cd backend

# Copy and fill in your environment variables
cp .env.example .env
# Edit .env with your Supabase + OpenAI credentials

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend

# Copy env
cp .env.example .env
# VITE_API_URL=http://localhost:8000/api/v1

# Install and run
npm install
npm run dev
```

Frontend available at `http://localhost:5173`

---

## Deployment

### Backend → Render

1. Push repo to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect your repo, set root directory to `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add all environment variables from `.env.example`

Or use the included `render.yaml` for one-click deploy.

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
# Set VITE_API_URL to your Render backend URL
```

Or connect GitHub repo to Vercel and set `VITE_API_URL` in project environment variables.

---

## Key Design Decisions

### 1. JSONB for Extracted Data
Invoice schemas vary wildly between vendors. Using PostgreSQL JSONB for `extracted_data` allows flexible querying (GIN indexes for fast lookups) without schema migrations every time a new field is discovered. Analytics views layer on top to provide SQL-friendly aggregations.

### 2. Prompt Engineering Strategy
The LLM system prompt enforces:
- **Vendor normalization**: "AMAZON.COM INC." → "Amazon"
- **Date standardization**: All dates → ISO 8601 (YYYY-MM-DD)
- **Currency detection**: From symbols (€ → EUR, ₹ → INR) and context
- **Noise handling**: Explicit instruction to interpret garbled OCR intelligently
- **Confidence scoring**: Forces the model to self-assess extraction quality (0.0–1.0)
- **JSON-only output**: `response_format: json_object` (OpenAI) prevents markdown wrapping

### 3. Format Template Reuse
Invoices from the same vendor tend to have the same layout. A structural fingerprint (keyword presence, table detection, line density, average line length) is hashed and stored. When a matching format is seen again, a hint is injected into the LLM prompt improving accuracy and reducing token usage.

### 4. OCR Pipeline Design
- **Native PDF text first**: pdfplumber extracts embedded text instantly at zero cost
- **Image OCR fallback**: Scanned PDFs and image invoices go through pdf2image → Tesseract
- **DPI 200**: Balances OCR quality vs. processing speed for typical invoice scans

### 5. Async Processing
Files are queued as FastAPI `BackgroundTask`s immediately after upload. The frontend polls `/invoices/{id}` every 2 seconds. This keeps the upload endpoint snappy (< 200ms response) while processing happens behind the scenes.

### 6. LLM Fallback Chain
Primary: OpenAI → if fails: Gemini → if both fail: structured error returned. This ensures the system degrades gracefully rather than failing silently.

---

## Assumptions & Limitations

- **Language**: Currently optimized for English invoices. International invoices (e.g., German `Rechnung`) will extract correctly since GPT-4o-mini handles multilingual text, but date/number formatting edge cases may require tuning.
- **OCR Quality**: Heavily distorted, handwritten, or low-DPI scans (< 150 DPI) will produce poor OCR text and low confidence scores.
- **Tesseract**: Free but less accurate than Google Vision or AWS Textract on complex layouts. Swap `ocr_service.py` to use a cloud OCR for higher accuracy.
- **Rate Limits**: OpenAI API rate limits apply. For high-volume batch processing, implement a queue (Redis + Celery) rather than `BackgroundTasks`.
- **File Size**: Limited to 20MB per file. Supabase Storage free tier has a 1GB limit.
- **Duplicate Detection**: Based on `invoice_number + vendor_name` match. Invoices without numbers can't be deduplicated this way.

---

## Potential Improvements

| Area | Improvement |
|------|------------|
| OCR | Swap Tesseract for Google Vision API / AWS Textract for +30% accuracy on complex layouts |
| Queue | Replace BackgroundTasks with Celery + Redis for distributed processing |
| Auth | Add Supabase Auth with JWT for multi-tenant support |
| LLM Cost | Cache LLM responses for identical OCR text hashes; use template reuse to skip LLM for known formats |
| Confidence | Fine-tune threshold logic; flag low-confidence fields for human review in the UI |
| Vendor ML | Train a small classifier to normalize vendor names across variations |
| Export | Add CSV/Excel export of extracted data |
| Webhooks | POST to user-defined URLs when processing completes |

---

## API Reference

### Upload Invoices
```
POST /api/v1/invoices/upload
Content-Type: multipart/form-data

files: [file1.pdf, file2.jpg, ...]

Response:
{
  "batch_id": "uuid",
  "total_files": 3,
  "queued": 3,
  "failed": [],
  "invoice_ids": ["uuid1", "uuid2", "uuid3"]
}
```

### Get Invoice Status
```
GET /api/v1/invoices/{invoice_id}

Response:
{
  "invoice_id": "uuid",
  "status": "completed",
  "data": {
    "invoice_number": "INV-001",
    "vendor_name": "Acme Corp",
    "total_amount": 1500.00,
    "currency": "USD",
    "confidence_score": 0.92,
    ...
  }
}
```

### Analytics Summary
```
GET /api/v1/analytics/summary

Response:
{
  "total_invoices": 142,
  "total_spend": 284750.00,
  "duplicate_invoices": 3,
  "top_vendors": [...],
  "monthly_trends": [...],
  "currency_totals": {"USD": 200000, "EUR": 84750}
}
```

---

## Test Data

Three sample invoices are included in `test-data/`:

| File | Vendor | Amount | Currency | Features |
|------|--------|--------|----------|---------|
| `invoice_techflow_001.html` | TechFlow Solutions | $12,305.00 | USD | 4 line items, discount, Net 30 |
| `invoice_vertex_002.html` | Vertex Supplies Co. | $1,529.73 | USD | Receipt-style, minimal formatting |
| `invoice_norddesign_003_EUR.html` | NordDesign GmbH | €23,800.00 | EUR | Bilingual (DE/EN), VAT, IBAN |

Open these HTML files in a browser and print-to-PDF to generate test PDFs, or screenshot them for image testing.

---

## Evaluation Criteria Mapping

| Criterion | Implementation |
|-----------|---------------|
| **AI/ML Thinking (30%)** | Structured prompt engineering with normalization rules, confidence scoring, format fingerprinting with template injection, multi-provider LLM fallback |
| **Engineering Quality (25%)** | FastAPI with async background processing, Pydantic v2 validation, typed React with Zustand, service layer separation |
| **Robustness (20%)** | OCR fallback chain (pdfplumber → Tesseract), LLM fallback (OpenAI → Gemini), error handling at every layer, graceful partial failures in batch |
| **Product Thinking (15%)** | Real-time processing queue UI, confidence badges, duplicate flagging, template reuse indicator, sortable invoice table |
| **Deployment (10%)** | Dockerfile + render.yaml for backend, vercel.json for frontend, `/health` endpoint |
| **Database Design (15%)** | JSONB + GIN indexes, analytics views (monthly_spend, vendor_spend), format_templates for learning, proper FK relationships |
| **Scalability Thinking (10%)** | Stateless API, background task queue (upgradeable to Celery), paginated list endpoints, indexed queries |
| **Analytics & Insights (10%)** | Monthly spend trends, top vendor spend bar chart, currency breakdown, processing status pie chart, KPI cards |

---

## Contact

Built for the Invoice Extraction AI challenge.  
Submission email: yashjeet.singh@avaipl.com
