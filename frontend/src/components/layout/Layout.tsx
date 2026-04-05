import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, FileText, BarChart3, Upload, Zap } from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { to: '/', icon: Upload, label: 'Upload' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-ink">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-ink-800 bg-ink-900">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-ink-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-acid rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-ink" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide text-ink-100">InvoiceAI</div>
              <div className="text-[10px] text-ink-500 font-mono">v1.0.0</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-acid/10 text-acid border border-acid/20'
                    : 'text-ink-400 hover:text-ink-100 hover:bg-ink-800',
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-ink-800">
          <div className="text-[11px] text-ink-600 leading-relaxed">
            Powered by GPT-4o mini<br />+ Tesseract OCR
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
