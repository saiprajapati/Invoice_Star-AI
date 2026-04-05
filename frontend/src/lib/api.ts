import axios from 'axios'
import type { Invoice, BatchUploadResponse, ProcessingResult, AnalyticsSummary } from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
})

export const invoiceApi = {
  upload: async (files: File[]): Promise<BatchUploadResponse> => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    const { data } = await api.post('/invoices/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  getStatus: async (id: string): Promise<ProcessingResult> => {
    const { data } = await api.get(`/invoices/${id}`)
    return data
  },

  list: async (limit = 50, offset = 0): Promise<Invoice[]> => {
    const { data } = await api.get('/invoices/', { params: { limit, offset } })
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/invoices/${id}`)
  },

  pollUntilDone: async (
    id: string,
    onUpdate?: (result: ProcessingResult) => void,
    intervalMs = 2000,
    maxAttempts = 60,
  ): Promise<ProcessingResult> => {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await invoiceApi.getStatus(id)
      onUpdate?.(result)
      if (result.status === 'completed' || result.status === 'failed') return result
      await new Promise(r => setTimeout(r, intervalMs))
    }
    throw new Error('Processing timed out')
  },
}

export const analyticsApi = {
  summary: async (): Promise<AnalyticsSummary> => {
    const { data } = await api.get('/analytics/summary')
    return data
  },
  vendors: async () => {
    const { data } = await api.get('/analytics/vendors')
    return data
  },
}

export const healthApi = {
  check: async () => {
    const { data } = await api.get('/health')
    return data
  },
}
