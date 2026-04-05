<div align="center">

<img src="https://img.shields.io/badge/Invoice_Star-AI-c8f135?style=for-the-badge&logoColor=black" alt="Invoice Star AI" />

# Invoice Star AI ⚡

### AI-powered invoice data extraction, storage & analytics platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![OpenAI](https://img.shields.io/badge/GPT--4o--mini-LLM-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com)

[Live Demo](#) · [API Docs](#) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## What is Invoice Star AI?

Invoice Star AI is a full-stack application I built to eliminate the manual effort of processing invoices. Drop in a PDF or image — the system runs OCR, feeds the raw text to an LLM with a carefully engineered prompt, and returns clean structured JSON with vendor details, line items, totals, and a confidence score. Everything gets stored in Supabase and surfaced through an analytics dashboard that shows spend trends, top vendors, and currency breakdowns.

Built with a focus on robustness: every stage has a fallback (pdfplumber → Tesseract, OpenAI → Gemini), and recurring invoice formats are fingerprinted and cached so the system gets faster and more accurate over time.

---

## Features

- **Batch Upload** — drag & drop up to 20 PDF/JPG/PNG files at once
- **OCR Pipeline** — native PDF text extraction with Tesseract fallback for scanned documents
- **LLM Extraction** — GPT-4o-mini parses raw OCR into structured JSON (vendor, line items, totals, dates, currency)
- **Confidence Scoring** — every extraction gets a 0–100% confidence score
- **Format Templates** — recurring invoice layouts are fingerprinted and reused, improving speed and accuracy
- **Duplicate Detection** — flags invoices with matching invoice number + vendor name
- **Analytics Dashboard** — monthly spend trends, top vendors by spend, currency breakdown, processing stats
- **Multi-currency** — detects USD, EUR, GBP, INR and more from symbols and context
- **Real-time Status** — frontend polls processing status and updates the queue live
- **LLM Fallback** — automatically retries with Google Gemini if OpenAI fails

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 + TypeScript + Vite | Fast DX, type safety, instant HMR |
| **Styling** | Tailwind CSS + Recharts | Utility-first, charts out of the box |
| **State** | Zustand | Lightweight, no boilerplate |
| **Backend** | FastAPI + Python 3.11 | Async-native, auto-generated API docs |
| **Validation** | Pydantic v2 | Schema enforcement at every layer |
| **OCR** | pytesseract + pdfplumber + pdf2image | Free, offline, no API costs |
| **LLM** | OpenAI GPT-4o-mini → Gemini (fallback) | Cost-efficient, strong JSON output |
| **Database** | Supabase (PostgreSQL + JSONB) | Flexible schema, built-in storage, RLS |
| **Deployment** | Render (backend) + Vercel (frontend) | Free tier friendly, Git-integrated |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│         Upload → Invoice List → Analytics Dashboard         │
└──────────────────────────┬──────────────────────────────────┘
                           │  REST  /api/v1
┌──────────────────────────▼──────────────────────────────────┐
│                    FastAPI Backend                          │
│                                                             │
│  POST /invoices/upload                                      │
│     ├─ Validate (type, size)                               │
│     ├─ Upload → Supabase Storage                           │
│     ├─ Create DB record  (status: pending)                 │
│     └─ Queue BackgroundTask ──────────────────────┐        │
│                                                   ▼        │
│                        Processing Pipeline:                 │
│                        ├─ OCR: pdfplumber                  │
│                        │       └─ fallback: Tesseract      │
│                        ├─ Template fingerprint lookup      │
│                        ├─ LLM: GPT-4o-mini                 │
│                        │       └─ fallback: Gemini         │
│                        ├─ Pydantic validation              │
│                        ├─ Duplicate check                  │
│                        └─ Save JSON → Supabase DB          │
│                                                             │
│  GET /invoices/          List + filter                      │
│  GET /invoices/{id}      Status + extracted data           │
│  GET /analytics/summary  KPIs, trends, vendors             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                       Supabase                              │
│  PostgreSQL (JSONB)  │  File Storage  │  Row-Level Security │
│  Tables: invoices, format_templates                         │
│  Views:  monthly_spend, vendor_spend, invoice_analytics     │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Invoice_Star-AI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── invoices.py         # Upload, status, list, delete
│   │   │   ├── analytics.py        # Spend summary & vendor analytics
│   │   │   └── health.py           # Health check endpoint
│   │   ├── core/
│   │   │   ├── config.py           # Environment & settings
│   │   │   └── database.py         # Supabase client
│   │   ├── models/
│   │   │   └── invoice.py          # Pydantic schemas
│   │   ├── services/
│   │   │   ├── ocr_service.py      # Tesseract + pdfplumber pipeline
│   │   │   ├── llm_service.py      # Prompt engineering + LLM parsing
│   │   │   ├── template_service.py # Format fingerprinting + dedup
│   │   │   ├── storage_service.py  # Supabase Storage upload
│   │   │   └── invoice_service.py  # Full pipeline orchestrator
│   │   └── main.py                 # FastAPI app entry
│   ├── supabase_migration.sql      # DB schema + indexes + views
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── UploadPage.tsx      # Dropzone + live processing queue
│       │   ├── InvoicesPage.tsx    # Sortable table + detail panel
│       │   └── AnalyticsPage.tsx   # KPI cards + charts
│       ├── components/
│       │   └── ui/InvoiceDetail.tsx
│       ├── store/invoiceStore.ts   # Zustand + polling logic
│       ├── lib/api.ts              # Typed API client
│       └── types/index.ts
├── test-data/                      # 3 sample invoices
├── render.yaml                     # One-click Render deploy
└── README.md
```

---

## Getting Started

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Tesseract OCR | latest | **Windows:** [UB-Mannheim installer](https://github.com/UB-Mannheim/tesseract/wiki) · **Mac:** `brew install tesseract` · **Linux:** `apt install tesseract-ocr` |
| Poppler | latest | **Windows:** [oschwartz10612/releases](https://github.com/oschwartz10612/poppler-windows/releases) · **Mac:** `brew install poppler` · **Linux:** `apt install poppler-utils` |

You'll also need a [Supabase](https://supabase.com) account and an [OpenAI](https://platform.openai.com) API key (or Gemini key).

---

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/Invoice_Star-AI.git
cd Invoice_Star-AI
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run the full contents of `backend/supabase_migration.sql`
3. Go to **Storage** → create a bucket named `invoices`, set it to **Public**
4. Copy your **Project URL**, **anon key**, and **service role key** from Project Settings → API

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
```

### 4. Run the backend

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`

### 5. Run the frontend

```bash
cd ../frontend
cp .env.example .env
# VITE_API_URL is already set to http://localhost:8000/api/v1

npm install
npm run dev
```

- App: `http://localhost:5173`

---

## Deployment

### Backend → Render

The repo includes a `render.yaml` for automatic deployment:

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → **Blueprint** → connect your repo
3. Render picks up `render.yaml` automatically
4. Add your env vars in the Render dashboard under the service's **Environment** tab

**Or manually:** New Web Service → Root Dir: `backend` → Build: `pip install -r requirements.txt` → Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

Set `VITE_API_URL` to your Render backend URL in Vercel project → Settings → Environment Variables.

---

## API Reference

<details>
<summary><strong>POST /api/v1/invoices/upload</strong> — Upload invoices for processing</summary>

```
Content-Type: multipart/form-data
Body: files[] — PDF, JPG, PNG · max 20MB each · up to 20 files

Response 200:
{
  "batch_id": "550e8400-e29b-41d4-a716",
  "total_files": 2,
  "queued": 2,
  "failed": [],
  "invoice_ids": ["uuid-1", "uuid-2"]
}
```
</details>

<details>
<summary><strong>GET /api/v1/invoices/{id}</strong> — Poll processing status + extracted data</summary>

```
Response 200:
{
  "invoice_id": "uuid-1",
  "status": "completed",
  "data": {
    "invoice_number": "INV-2024-001",
    "vendor_name": "TechFlow Solutions",
    "invoice_date": "2024-03-15",
    "due_date": "2024-04-14",
    "line_items": [
      { "description": "Cloud Setup", "quantity": 1, "unit_price": 3500.00, "total": 3500.00 }
    ],
    "subtotal": 11500.00,
    "tax_amount": 920.00,
    "total_amount": 12305.00,
    "currency": "USD",
    "confidence_score": 0.94
  }
}
```
</details>

<details>
<summary><strong>GET /api/v1/analytics/summary</strong> — Spend analytics overview</summary>

```
Response 200:
{
  "total_invoices": 142,
  "total_spend": 284750.00,
  "duplicate_invoices": 3,
  "top_vendors": [
    { "vendor": "TechFlow Solutions", "total_spend": 84200.00, "invoice_count": 7 }
  ],
  "monthly_trends": [
    { "month": "2024-01", "total_spend": 32400.00 }
  ],
  "currency_totals": { "USD": 200000.00, "EUR": 84750.00 }
}
```
</details>

---

## Design Decisions

**JSONB for extracted data** — Invoice schemas vary wildly between vendors. JSONB lets me store any structure without schema migrations, while GIN indexes keep queries fast. SQL views layer on top for analytics aggregations.

**Format template fingerprinting** — After processing a few invoices from the same vendor, the layout is always the same. I hash the structural signature (keyword presence, table detection, line density) and store it. Next time that format appears, a layout hint is injected into the LLM prompt — improving accuracy and cutting token usage.

**OCR before cloud APIs** — pdfplumber extracts native PDF text in milliseconds at zero cost. Tesseract handles scanned images. Swapping to Google Vision or AWS Textract is a single file change if higher accuracy is ever needed.

**Async background tasks** — The upload endpoint responds in < 200ms regardless of document complexity. OCR + LLM takes 3–15 seconds, so processing runs in the background. The frontend polls every 2 seconds to show live status updates.

---

## Test Data

Three sample invoices are in `test-data/` covering different formats and edge cases:

| File | Vendor | Amount | Notes |
|------|--------|--------|-------|
| `invoice_techflow_001.html` | TechFlow Solutions | $12,305.00 | Standard US format, 4 line items, discount |
| `invoice_vertex_002.html` | Vertex Supplies Co. | $1,529.73 | Monospace receipt-style, minimal structure |
| `invoice_norddesign_003_EUR.html` | NordDesign GmbH | €23,800.00 | Bilingual DE/EN, VAT, IBAN bank details |

Open in browser → **Print → Save as PDF** to generate test PDFs, or screenshot for image testing.

---

## Known Limitations

- Heavily distorted or handwritten invoices will produce low confidence scores — OCR limitation, not the LLM
- Duplicate detection requires an invoice number to be present
- OpenAI rate limits apply on free tier — for high-volume processing, replace `BackgroundTasks` with Celery + Redis
- Supabase free tier: 500MB database, 1GB storage

---

## What I'd Build Next

- [ ] CSV / Excel export from the analytics dashboard
- [ ] Email notifications on batch completion
- [ ] Supabase Auth for multi-user support
- [ ] Field-level confidence highlighting on the original document image
- [ ] Swap Tesseract for Google Vision on high-accuracy mode
- [ ] Celery + Redis queue for production-scale processing

---

## Author

**Sai Prajapati**

[![GitHub](https://img.shields.io/badge/GitHub-saiprajapati-181717?style=flat-square&logo=github)](https://github.com/saiprajapati)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/sai-prajapati/)

---

<div align="center">
<sub>Built with FastAPI · React · Supabase · OpenAI · Tesseract</sub>
</div>
