import { create } from 'zustand'
import type { Invoice, ProcessingResult } from '@/types'
import { invoiceApi } from '@/lib/api'

interface UploadItem {
  fileId: string
  fileName: string
  invoiceId?: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  error?: string
  result?: ProcessingResult
}

interface InvoiceStore {
  invoices: Invoice[]
  uploadQueue: UploadItem[]
  isLoadingInvoices: boolean
  isUploading: boolean

  fetchInvoices: () => Promise<void>
  uploadFiles: (files: File[]) => Promise<void>
  deleteInvoice: (id: string) => Promise<void>
  clearQueue: () => void
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  invoices: [],
  uploadQueue: [],
  isLoadingInvoices: false,
  isUploading: false,

  fetchInvoices: async () => {
    set({ isLoadingInvoices: true })
    try {
      const invoices = await invoiceApi.list(100, 0)
      set({ invoices })
    } catch (e) {
      console.error('Failed to fetch invoices', e)
    } finally {
      set({ isLoadingInvoices: false })
    }
  },

  uploadFiles: async (files: File[]) => {
    set({ isUploading: true })
    try {
      const response = await invoiceApi.upload(files)

      // Seed queue items
      const queueItems: UploadItem[] = response.invoice_ids.map((id, i) => ({
        fileId: `${i}`,
        fileName: files[i]?.name || `file-${i}`,
        invoiceId: id,
        status: 'processing',
      }))

      // Add failed uploads
      const failedItems: UploadItem[] = response.failed.map((msg, i) => ({
        fileId: `failed-${i}`,
        fileName: msg.split(':')[0],
        status: 'failed',
        error: msg,
      }))

      set(state => ({
        uploadQueue: [...queueItems, ...failedItems, ...state.uploadQueue],
        isUploading: false,
      }))

      // Poll each invoice in parallel
      response.invoice_ids.forEach(id => {
        invoiceApi
          .pollUntilDone(id, result => {
            set(state => ({
              uploadQueue: state.uploadQueue.map(item =>
                item.invoiceId === id
                  ? { ...item, status: result.status as UploadItem['status'], result }
                  : item,
              ),
            }))
          })
          .then(() => get().fetchInvoices())
          .catch(() => {})
      })
    } catch (e: any) {
      set({ isUploading: false })
      throw e
    }
  },

  deleteInvoice: async (id: string) => {
    await invoiceApi.delete(id)
    set(state => ({
      invoices: state.invoices.filter(inv => inv.id !== id),
    }))
  },

  clearQueue: () => set({ uploadQueue: [] }),
}))
