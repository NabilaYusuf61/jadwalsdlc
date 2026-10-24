import { Database, LayoutGrid } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'

function LogoMark() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm shadow-brand-700/30">
      <span className="absolute left-[9px] top-[9px] h-1.5 w-[9px] rounded-full bg-white/95" />
      <span className="absolute left-[9px] top-[15px] h-1.5 w-[15px] rounded-full bg-white/70" />
      <span className="absolute left-[9px] top-[21px] h-1.5 w-[20px] rounded-full bg-white/45" />
    </span>
  )
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight text-slate-900">
                Jadwal<span className="text-brand-600">SDLC</span>
              </span>
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 sm:block">
                Manajemen proyek
              </span>
            </span>
          </Link>

          <nav className="ml-2 flex items-center gap-1 sm:ml-6">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
                )
              }
            >
              <LayoutGrid className="h-4 w-4" />
              Dashboard
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-[11px] font-semibold text-slate-500 sm:flex">
              <Database className="h-3.5 w-3.5 text-emerald-600" />
              Tersimpan di perangkat ini
            </span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 sm:hidden"
              title="Data tersimpan lokal"
            >
              <Database className="h-4 w-4 text-emerald-600" />
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>

      <footer className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-1 px-4 py-6 text-[11px] text-slate-400 sm:flex-row sm:px-6 lg:px-8">
        <p>JadwalSDLC · Perencanaan proyek perangkat lunak berbasis Gantt chart.</p>
        <p className="hidden sm:block">Data disimpan lokal di browser Anda.</p>
      </footer>
    </div>
  )
}
