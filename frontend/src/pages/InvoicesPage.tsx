import { useEffect, useState } from 'react'
import { Search, RefreshCw, Trash2, Copy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import { useInvoiceStore } from '@/store/invoiceStore'
import type { Invoice } from '@/types'
import InvoiceDetail from '@/components/ui/InvoiceDetail'

export default function InvoicesPage() {
  const { invoices, fetchInvoices, deleteInvoice, isLoadingInvoices } = useInvoiceStore()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [sortKey, setSortKey] = useState<'created_at' | 'vendor' | 'amount'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const toggle = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = invoices
    .filter(inv => {
      if (!search) return true
      const s = search.toLowerCase()
      return (
        inv.file_name.toLowerCase().includes(s) ||
        inv.extracted_data?.vendor_name?.toLowerCase().includes(s) ||
        inv.extracted_data?.invoice_number?.toLowerCase().includes(s) ||
        inv.status.includes(s)
      )
    })
    .sort((a, b) => {
      let va: any, vb: any
      if (sortKey === 'created_at') { va = a.created_at; vb = b.created_at }
      else if (sortKey === 'vendor') { va = a.extracted_data?.vendor_name || ''; vb = b.extracted_data?.vendor_name || '' }
      else { va = a.extracted_data?.total_amount || 0; vb = b.extracted_data?.total_amount || 0 }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const SortIcon = ({ col }: { col: typeof sortKey }) => (
    sortKey === col
      ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      : <ChevronDown size={12} className="opacity-30" />
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Table side */}
      <div className={clsx('flex flex-col transition-all duration-200', selected ? 'w-[55%]' : 'w-full')}>
        {/* Header */}
        <div className="px-8 py-6 border-b border-ink-800 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink-50 tracking-tight">Invoices</h1>
            <p className="text-ink-500 text-sm mt-0.5">{invoices.length} total</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendor, invoice #…"
                className="bg-ink-800 border border-ink-700 rounded-lg pl-9 pr-4 py-2 text-sm text-ink-200
                           placeholder-ink-600 focus:outline-none focus:border-acid/50 w-56"
              />
            </div>
            <button
              onClick={() => fetchInvoices()}
              disabled={isLoadingInvoices}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <RefreshCw size={14} className={isLoadingInvoices ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-ink-600">
              <p className="text-lg font-medium">No invoices found</p>
              <p className="text-sm mt-1">Upload some invoices to get started</p>
            </div>
          ) : (
            <table className="w-full data-table">
              <thead className="sticky top-0 bg-ink-900 border-b border-ink-800 z-10">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                    File
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider cursor-pointer hover:text-ink-300"
                    onClick={() => toggle('vendor')}
                  >
                    <div className="flex items-center gap-1">Vendor <SortIcon col="vendor" /></div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider cursor-pointer hover:text-ink-300"
                    onClick={() => toggle('amount')}
                  >
                    <div className="flex items-center justify-end gap-1">Amount <SortIcon col="amount" /></div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider cursor-pointer hover:text-ink-300"
                    onClick={() => toggle('created_at')}
                  >
                    <div className="flex items-center gap-1">Date <SortIcon col="created_at" /></div>
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <InvoiceRow
                    key={inv.id}
                    invoice={inv}
                    isSelected={selected?.id === inv.id}
                    onClick={() => setSelected(selected?.id === inv.id ? null : inv)}
                    onDelete={async () => {
                      await deleteInvoice(inv.id)
                      if (selected?.id === inv.id) setSelected(null)
                    }}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="w-[45%] border-l border-ink-800 overflow-y-auto animate-slide-up">
          <InvoiceDetail invoice={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  )
}

function InvoiceRow({
  invoice, isSelected, onClick, onDelete,
}: {
  invoice: Invoice
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}) {
  const d = invoice.extracted_data
  const amount = d?.total_amount
  const currency = d?.currency || 'USD'

  return (
    <tr
      onClick={onClick}
      className={clsx(
        'cursor-pointer transition-colors border-b border-ink-800/60',
        isSelected ? 'bg-acid/5' : 'hover:bg-ink-800/50',
      )}
    >
      <td className="px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-300 font-mono truncate max-w-[140px]">{invoice.file_name}</span>
          {invoice.is_duplicate && (
            <span className="badge bg-orange-900/40 text-orange-400 text-[10px]">dup</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-ink-200">{d?.vendor_name || <span className="text-ink-600">—</span>}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-mono text-ink-400">{d?.invoice_number || '—'}</span>
      </td>
      <td className="px-4 py-3 text-right">
        {amount != null ? (
          <span className="text-sm font-mono font-medium text-acid">
            {currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        ) : <span className="text-ink-600">—</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`badge-${invoice.status}`}>
          {invoice.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-ink-500 font-mono">
          {new Date(invoice.created_at).toLocaleDateString()}
        </span>
      </td>
      <td className="px-2 py-3">
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-900/40 text-ink-600 hover:text-red-400 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}
