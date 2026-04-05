export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface LineItem {
  description?: string
  quantity?: number
  unit_price?: number
  total?: number
  tax_rate?: number
}

export interface InvoiceData {
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  vendor_name?: string
  vendor_address?: string
  vendor_email?: string
  vendor_phone?: string
  vendor_tax_id?: string
  customer_name?: string
  customer_address?: string
  line_items?: LineItem[]
  subtotal?: number
  tax_amount?: number
  discount?: number
  total_amount?: number
  currency?: string
  payment_terms?: string
  notes?: string
  confidence_score?: number
  format_template_id?: string
}

export interface Invoice {
  id: string
  file_name: string
  file_url?: string
  file_size?: number
  mime_type?: string
  status: ProcessingStatus
  extracted_data?: InvoiceData
  raw_ocr_text?: string
  error_message?: string
  is_duplicate?: boolean
  duplicate_of?: string
  created_at: string
  updated_at?: string
}

export interface BatchUploadResponse {
  batch_id: string
  total_files: number
  queued: number
  failed: string[]
  invoice_ids: string[]
}

export interface ProcessingResult {
  invoice_id: string
  status: ProcessingStatus
  data?: InvoiceData
  error?: string
}

export interface AnalyticsSummary {
  total_invoices: number
  total_spend: number
  duplicate_invoices: number
  top_vendors: { vendor: string; total_spend: number; invoice_count: number }[]
  monthly_trends: { month: string; total_spend: number }[]
  currency_totals: Record<string, number>
  processing_stats: Record<string, number>
}
