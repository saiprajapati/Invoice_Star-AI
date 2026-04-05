import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { TrendingUp, FileText, AlertTriangle, DollarSign, RefreshCw } from 'lucide-react'
import { analyticsApi } from '@/lib/api'
import type { AnalyticsSummary } from '@/types'
import clsx from 'clsx'

const ACID = '#c8f135'
const MUTED_COLORS = ['#c8f135', '#88b825', '#5a7a18', '#3d5410', '#2a3a0b', '#1a250a']

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const summary = await analyticsApi.summary()
      setData(summary)
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex items-center gap-3 text-ink-400">
        <RefreshCw size={18} className="animate-spin" />
        <span>Loading analytics…</span>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 text-ink-400">
      <AlertTriangle size={24} className="text-red-400" />
      <p>{error}</p>
      <button onClick={load} className="btn-primary text-sm">Retry</button>
    </div>
  )

  if (!data) return null

  const stats = data.processing_stats || {}
  const totalProcessed = (stats.completed || 0)
  const failRate = totalProcessed > 0
    ? ((stats.failed || 0) / (totalProcessed + (stats.failed || 0)) * 100).toFixed(1)
    : '0'

  const currencyEntries = Object.entries(data.currency_totals || {})

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-ink-50 tracking-tight">Analytics</h1>
          <p className="text-ink-500 text-sm mt-1">Spend intelligence across all processed invoices</p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KPICard
          icon={<FileText size={16} />}
          label="Total Invoices"
          value={data.total_invoices.toString()}
          sub={`${stats.completed || 0} completed`}
        />
        <KPICard
          icon={<DollarSign size={16} />}
          label="Total Spend"
          value={formatCurrency(data.total_spend)}
          sub={currencyEntries.length > 1 ? `${currencyEntries.length} currencies` : currencyEntries[0]?.[0] || 'USD'}
          accent
        />
        <KPICard
          icon={<AlertTriangle size={16} />}
          label="Duplicates"
          value={data.duplicate_invoices.toString()}
          sub="detected & flagged"
        />
        <KPICard
          icon={<TrendingUp size={16} />}
          label="Failure Rate"
          value={`${failRate}%`}
          sub={`${stats.failed || 0} failed`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Monthly spend trend */}
        <div className="card px-5 py-5">
          <h3 className="font-semibold text-ink-200 mb-4">Monthly Spend Trend</h3>
          {data.monthly_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.monthly_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={v => formatCurrency(v, true)} />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d', borderRadius: 8 }}
                  labelStyle={{ color: '#e8e8e8' }}
                  formatter={(v: any) => [formatCurrency(v), 'Spend']}
                />
                <Line
                  type="monotone" dataKey="total_spend"
                  stroke={ACID} strokeWidth={2} dot={{ fill: ACID, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Top vendors bar */}
        <div className="card px-5 py-5">
          <h3 className="font-semibold text-ink-200 mb-4">Top Vendors by Spend</h3>
          {data.top_vendors.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.top_vendors.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={v => formatCurrency(v, true)} />
                <YAxis type="category" dataKey="vendor" tick={{ fill: '#e8e8e8', fontSize: 11 }} width={90} />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d', borderRadius: 8 }}
                  formatter={(v: any) => [formatCurrency(v), 'Spend']}
                />
                <Bar dataKey="total_spend" radius={[0, 4, 4, 0]}>
                  {data.top_vendors.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={MUTED_COLORS[i % MUTED_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Currency breakdown */}
        <div className="card px-5 py-5">
          <h3 className="font-semibold text-ink-200 mb-4">By Currency</h3>
          {currencyEntries.length > 0 ? (
            <div className="space-y-3">
              {currencyEntries.sort((a, b) => b[1] - a[1]).map(([currency, amount], i) => (
                <div key={currency} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-ink-400 w-10">{currency}</span>
                  <div className="flex-1 h-2 bg-ink-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(amount / Math.max(...currencyEntries.map(e => e[1]))) * 100}%`,
                        background: MUTED_COLORS[i % MUTED_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="font-mono text-xs text-acid w-20 text-right">{formatCurrency(amount, true)}</span>
                </div>
              ))}
            </div>
          ) : <EmptyChart />}
        </div>

        {/* Processing status */}
        <div className="card px-5 py-5">
          <h3 className="font-semibold text-ink-200 mb-4">Processing Status</h3>
          {Object.keys(stats).length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={Object.entries(stats).map(([name, value]) => ({ name, value }))}
                  cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                  dataKey="value"
                >
                  {Object.keys(stats).map((key, i) => (
                    <Cell key={key} fill={
                      key === 'completed' ? '#34d399' :
                      key === 'failed' ? '#f87171' :
                      key === 'processing' ? '#fbbf24' : '#4b5563'
                    } />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d', borderRadius: 8 }}
                />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={v => <span style={{ color: '#888', fontSize: 11 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Vendor table */}
        <div className="card px-5 py-5">
          <h3 className="font-semibold text-ink-200 mb-4">Vendor Summary</h3>
          {data.top_vendors.length > 0 ? (
            <div className="space-y-2">
              {data.top_vendors.slice(0, 5).map((v, i) => (
                <div key={v.vendor} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-ink-600 w-4">{i + 1}</span>
                    <span className="text-sm text-ink-300 truncate">{v.vendor}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-xs font-mono text-acid">{formatCurrency(v.total_spend, true)}</div>
                    <div className="text-[10px] text-ink-600">{v.invoice_count} inv.</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyChart />}
        </div>
      </div>
    </div>
  )
}

function KPICard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: string; accent?: boolean
}) {
  return (
    <div className={clsx('card px-5 py-4', accent && 'border-acid/20 bg-acid/5')}>
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center mb-3',
        accent ? 'bg-acid/20 text-acid' : 'bg-ink-700 text-ink-400')}>
        {icon}
      </div>
      <div className={clsx('text-2xl font-bold tracking-tight', accent ? 'text-acid' : 'text-ink-100')}>
        {value}
      </div>
      <div className="text-xs text-ink-500 mt-1">{label}</div>
      <div className="text-[11px] text-ink-600 mt-0.5">{sub}</div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-28 text-ink-600 text-sm">
      No data yet
    </div>
  )
}

function formatCurrency(v: number, compact = false): string {
  if (compact && v >= 1000) {
    return v >= 1_000_000
      ? `$${(v / 1_000_000).toFixed(1)}M`
      : `$${(v / 1000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}
