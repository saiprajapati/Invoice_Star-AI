import { X, ExternalLink, Copy, AlertTriangle, CheckCircle } from 'lucide-react'
import clsx from 'clsx'
import type { Invoice, InvoiceData } from '@/types'

interface Props {
  invoice: Invoice
  onClose: () => void
}

export default function InvoiceDetail({ invoice, onClose }: Props) {
  const d = invoice.extracted_data
  const confidence = d?.confidence_score || 0

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(d, null, 2))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-ink-800 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-ink-100 truncate">{invoice.file_name}</h2>
          <p className="text-xs text-ink-500 font-mono mt-0.5">{invoice.id}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {invoice.file_url && (
            <a href={invoice.file_url} target="_blank" rel="noreferrer"
               className="btn-ghost p-1.5" title="Open original file">
              <ExternalLink size={14} />
            </a>
          )}
          <button onClick={copyJSON} className="btn-ghost p-1.5" title="Copy JSON">
            <Copy size={14} />
          </button>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-6 py-3 border-b border-ink-800 flex items-center gap-4">
        <span className={`badge-${invoice.status}`}>{invoice.status}</span>
        {invoice.is_duplicate && (
          <span className="flex items-center gap-1 text-xs text-orange-400">
            <AlertTriangle size={11} /> Duplicate detected
          </span>
        )}
        {d?.confidence_score != null && (
          <ConfidenceBar score={d.confidence_score} />
        )}
        {d?.format_template_id && (
          <span className="text-xs text-acid flex items-center gap-1">
            <CheckCircle size={11} /> Template reused
          </span>
        )}
      </div>

      {invoice.status === 'failed' && (
        <div className="mx-6 mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-sm text-red-400">
          {invoice.error_message || 'Processing failed'}
        </div>
      )}

      {d && (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Invoice header fields */}
          <Section title="Invoice Details">
            <FieldGrid fields={[
              { label: 'Invoice #', value: d.invoice_number },
              { label: 'Invoice Date', value: d.invoice_date },
              { label: 'Due Date', value: d.due_date },
              { label: 'Payment Terms', value: d.payment_terms },
              { label: 'Currency', value: d.currency },
            ]} />
          </Section>

          {/* Vendor */}
          <Section title="Vendor">
            <FieldGrid fields={[
              { label: 'Name', value: d.vendor_name, highlight: true },
              { label: 'Address', value: d.vendor_address },
              { label: 'Email', value: d.vendor_email },
              { label: 'Phone', value: d.vendor_phone },
              { label: 'Tax ID', value: d.vendor_tax_id },
            ]} />
          </Section>

          {/* Customer */}
          {(d.customer_name || d.customer_address) && (
            <Section title="Bill To">
              <FieldGrid fields={[
                { label: 'Name', value: d.customer_name },
                { label: 'Address', value: d.customer_address },
              ]} />
            </Section>
          )}

          {/* Line items */}
          {d.line_items && d.line_items.length > 0 && (
            <Section title={`Line Items (${d.line_items.length})`}>
              <div className="space-y-1.5">
                {d.line_items.map((item, i) => (
                  <div key={i} className="bg-ink-900 rounded-lg px-3 py-2.5 flex items-start justify-between gap-3">
                    <span className="text-sm text-ink-200 flex-1">{item.description || `Item ${i + 1}`}</span>
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      {item.quantity != null && item.unit_price != null && (
                        <div className="text-xs text-ink-500 font-mono">
                          {item.quantity} × {d.currency} {item.unit_price?.toFixed(2)}
                        </div>
                      )}
                      {item.total != null && (
                        <div className="text-sm font-mono font-medium text-ink-200">
                          {d.currency} {item.total.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Totals */}
          <Section title="Totals">
            <div className="space-y-1.5">
              {d.subtotal != null && <TotalRow label="Subtotal" value={d.subtotal} currency={d.currency} />}
              {d.tax_amount != null && <TotalRow label="Tax" value={d.tax_amount} currency={d.currency} />}
              {d.discount != null && <TotalRow label="Discount" value={-d.discount} currency={d.currency} />}
              {d.total_amount != null && (
                <TotalRow label="Total" value={d.total_amount} currency={d.currency} highlight />
              )}
            </div>
          </Section>

          {d.notes && (
            <Section title="Notes">
              <p className="text-sm text-ink-400 leading-relaxed">{d.notes}</p>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2.5">{title}</h3>
      {children}
    </div>
  )
}

function FieldGrid({ fields }: { fields: { label: string; value?: string | null; highlight?: boolean }[] }) {
  const visible = fields.filter(f => f.value)
  if (visible.length === 0) return <p className="text-xs text-ink-600 italic">No data extracted</p>
  return (
    <div className="grid grid-cols-2 gap-2">
      {visible.map(({ label, value, highlight }) => (
        <div key={label} className={clsx(
          'rounded-lg px-3 py-2.5',
          highlight ? 'bg-acid/5 border border-acid/20' : 'bg-ink-900',
        )}>
          <div className="text-[10px] font-semibold text-ink-500 uppercase tracking-wide mb-0.5">{label}</div>
          <div className={clsx('text-sm font-medium truncate', highlight ? 'text-acid' : 'text-ink-200')}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

function TotalRow({ label, value, currency, highlight }: {
  label: string; value: number; currency?: string; highlight?: boolean
}) {
  return (
    <div className={clsx(
      'flex items-center justify-between px-3 py-2 rounded-lg',
      highlight ? 'bg-acid/10 border border-acid/20' : 'bg-ink-900',
    )}>
      <span className={clsx('text-sm', highlight ? 'font-bold text-acid' : 'text-ink-400')}>{label}</span>
      <span className={clsx('font-mono text-sm', highlight ? 'font-bold text-acid' : 'text-ink-200')}>
        {value < 0 ? '-' : ''}{currency} {Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
    </div>
  )
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-ink-700 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-ink-500 font-mono">{pct}% confidence</span>
    </div>
  )
}
