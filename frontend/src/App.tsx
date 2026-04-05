import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import UploadPage from '@/pages/UploadPage'
import InvoicesPage from '@/pages/InvoicesPage'
import AnalyticsPage from '@/pages/AnalyticsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<UploadPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Route>
    </Routes>
  )
}
