import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useInvoiceStore } from '@/store/invoiceStore'
import { Link } from 'react-router-dom'

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
}

export default function UploadPage() {
  const { uploadFiles, uploadQueue, isUploading, clearQueue } = useInvoiceStore()
  const [dragError, setDragError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (accepted: File[], rejected: any[]) => {
      setDragError(null)
      if (rejected.length > 0) {
        setDragError(`${rejected.length} file(s) rejected — only PDF, JPG, PNG accepted (max 20MB each)`)
      }
      if (accepted.length > 0) {
        try {
          await uploadFiles(accepted)
        } catch (e: any) {
          setDragError(e.message || 'Upload failed')
        }
      }
    },
    [uploadFiles],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 20 * 1024 * 1024,
    maxFiles: 20,
  })

  const activeItems = uploadQueue.filter(i => i.status !== 'failed' || i.invoiceId)
  const completedCount = uploadQueue.filter(i => i.status === 'completed').length
  const failedCount = uploadQueue.filter(i => i.status === 'failed').length
  const processingCount = uploadQueue.filter(i => i.status === 'processing').length

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-ink-50 tracking-tight">Upload Invoices</h1>
        <p className="mt-1.5 text-ink-400">
          Drop PDF or image invoices — AI extracts structured data automatically
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-2xl px-8 py-14 text-center cursor-pointer',
          'transition-all duration-200',
          isDragActive
            ? 'border-acid bg-acid/5 drop-active'
            : 'border-ink-700 hover:border-ink-500 bg-ink-900',
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <div
            className={clsx(
              'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
              isDragActive ? 'bg-acid/20' : 'bg-ink-800',
            )}
          >
            <Upload
              size={28}
              className={isDragActive ? 'text-acid' : 'text-ink-400'}
            />
          </div>

          <div>
            <p className="text-lg font-semibold text-ink-100">
              {isDragActive ? 'Drop to upload' : 'Drag & drop invoices here'}
            </p>
            <p className="text-ink-500 mt-1 text-sm">
              or <span className="text-acid underline underline-offset-2">browse files</span>
            </p>
          </div>

          <div className="flex gap-3 flex-wrap justify-center">
            {['PDF', 'JPG', 'PNG'].map(fmt => (
              <span key={fmt} className="font-mono text-xs px-2.5 py-1 bg-ink-800 text-ink-400 rounded-md border border-ink-700">
                .{fmt.toLowerCase()}
              </span>
            ))}
            <span className="font-mono text-xs px-2.5 py-1 bg-ink-800 text-ink-400 rounded-md border border-ink-700">
              max 20MB
            </span>
            <span className="font-mono text-xs px-2.5 py-1 bg-ink-800 text-ink-400 rounded-md border border-ink-700">
              up to 20 files
            </span>
          </div>
        </div>

        {isUploading && (
          <div className="absolute inset-0 bg-ink-900/80 rounded-2xl flex items-center justify-center">
            <div className="flex items-center gap-3 text-acid">
              <Loader2 size={20} className="animate-spin" />
              <span className="font-medium">Uploading…</span>
            </div>
          </div>
        )}
      </div>

      {dragError && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle size={14} />
          {dragError}
        </div>
      )}

      {/* Processing Queue */}
      {uploadQueue.length > 0 && (
        <div className="mt-8 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink-200">
              Processing Queue
              <span className="ml-2 text-ink-500 font-normal text-sm">
                ({completedCount} done
                {processingCount > 0 && `, ${processingCount} running`}
                {failedCount > 0 && `, ${failedCount} failed`})
              </span>
            </h2>
            <button onClick={clearQueue} className="btn-ghost text-xs flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          </div>

          <div className="space-y-2">
            {uploadQueue.map((item, i) => (
              <QueueItem key={item.fileId + i} item={item} />
            ))}
          </div>

          {completedCount > 0 && (
            <Link
              to="/invoices"
              className="mt-4 flex items-center gap-2 text-sm text-acid hover:text-acid-light transition-colors"
            >
              View extracted invoices <ChevronRight size={14} />
            </Link>
          )}
        </div>
      )}

      {/* Info cards */}
      {uploadQueue.length === 0 && (
        <div className="mt-10 grid grid-cols-3 gap-4">
          {[
            { title: 'OCR Extraction', desc: 'Tesseract OCR extracts raw text from any document format' },
            { title: 'AI Parsing', desc: 'GPT-4o mini converts noisy OCR into clean structured JSON' },
            { title: 'Smart Templates', desc: 'Recurring vendor formats are detected and reused automatically' },
          ].map(card => (
            <div key={card.title} className="card px-4 py-4">
              <div className="w-1.5 h-4 bg-acid rounded-full mb-3" />
              <p className="text-sm font-semibold text-ink-200 mb-1">{card.title}</p>
              <p className="text-xs text-ink-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QueueItem({ item }: { item: ReturnType<typeof useInvoiceStore.getState>['uploadQueue'][number] }) {
  const icon = {
    queued: <Loader2 size={14} className="text-ink-400 animate-spin" />,
    processing: <Loader2 size={14} className="text-amber-400 animate-spin" />,
    completed: <CheckCircle2 size={14} className="text-emerald-400" />,
    failed: <AlertCircle size={14} className="text-red-400" />,
  }[item.status]

  const confidence = item.result?.data?.confidence_score
  const vendor = item.result?.data?.vendor_name
  const amount = item.result?.data?.total_amount
  const currency = item.result?.data?.currency || 'USD'

  return (
    <div className={clsx(
      'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
      item.status === 'completed' ? 'border-emerald-900/50 bg-emerald-950/20' :
      item.status === 'failed'    ? 'border-red-900/50 bg-red-950/20' :
      'border-ink-700 bg-ink-900',
    )}>
      <FileText size={14} className="text-ink-500 flex-shrink-0" />
      <span className="text-sm text-ink-200 flex-1 truncate font-mono">{item.fileName}</span>

      {item.status === 'completed' && vendor && (
        <span className="text-xs text-ink-400 truncate max-w-[120px]">{vendor}</span>
      )}
      {item.status === 'completed' && amount != null && (
        <span className="text-xs font-mono text-acid font-medium">
          {currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )}
      {confidence != null && (
        <span className={clsx(
          'text-[10px] font-mono px-1.5 py-0.5 rounded',
          confidence >= 0.8 ? 'bg-emerald-900/50 text-emerald-400' :
          confidence >= 0.5 ? 'bg-amber-900/50 text-amber-400' :
          'bg-red-900/50 text-red-400',
        )}>
          {Math.round(confidence * 100)}%
        </span>
      )}
      {item.error && <span className="text-xs text-red-400 truncate max-w-[160px]">{item.error}</span>}

      <div className="flex-shrink-0">{icon}</div>
    </div>
  )
}
