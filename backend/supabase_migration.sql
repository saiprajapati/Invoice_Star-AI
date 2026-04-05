-- ============================================================
-- Invoice Extraction AI - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    raw_ocr_text TEXT,
    extracted_data JSONB,
    error_message TEXT,
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of UUID REFERENCES invoices(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices((extracted_data->>'vendor_name'));
CREATE INDEX IF NOT EXISTS idx_invoices_extracted_data ON invoices USING GIN(extracted_data);

-- ============================================================
-- FORMAT TEMPLATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS format_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signature_hash TEXT UNIQUE NOT NULL,
    signature JSONB NOT NULL,
    field_hints TEXT,
    sample_invoice_id UUID REFERENCES invoices(id),
    use_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_hash ON format_templates(signature_hash);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE format_templates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated operations (adjust for your auth setup)
CREATE POLICY "Service role full access invoices"
    ON invoices FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access templates"
    ON format_templates FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- Run this in Supabase Dashboard > Storage, or via API:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('invoices', 'invoices', true);

-- ============================================================
-- HELPFUL VIEWS FOR ANALYTICS
-- ============================================================
CREATE OR REPLACE VIEW invoice_analytics AS
SELECT
    id,
    file_name,
    status,
    is_duplicate,
    extracted_data->>'vendor_name' AS vendor_name,
    extracted_data->>'invoice_number' AS invoice_number,
    extracted_data->>'invoice_date' AS invoice_date,
    (extracted_data->>'total_amount')::NUMERIC AS total_amount,
    extracted_data->>'currency' AS currency,
    (extracted_data->>'confidence_score')::NUMERIC AS confidence_score,
    created_at
FROM invoices
WHERE status = 'completed';

-- Monthly spend view
CREATE OR REPLACE VIEW monthly_spend AS
SELECT
    DATE_TRUNC('month', created_at) AS month,
    extracted_data->>'currency' AS currency,
    SUM((extracted_data->>'total_amount')::NUMERIC) AS total_spend,
    COUNT(*) AS invoice_count
FROM invoices
WHERE status = 'completed'
  AND extracted_data->>'total_amount' IS NOT NULL
GROUP BY 1, 2
ORDER BY 1 DESC;

-- Vendor spend view
CREATE OR REPLACE VIEW vendor_spend AS
SELECT
    extracted_data->>'vendor_name' AS vendor_name,
    COUNT(*) AS invoice_count,
    SUM((extracted_data->>'total_amount')::NUMERIC) AS total_spend,
    AVG((extracted_data->>'total_amount')::NUMERIC) AS avg_invoice_amount,
    MAX(created_at) AS last_invoice_date
FROM invoices
WHERE status = 'completed'
  AND extracted_data->>'vendor_name' IS NOT NULL
GROUP BY 1
ORDER BY 3 DESC;
