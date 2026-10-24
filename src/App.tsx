import { Link, Route, Routes } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectPage } from './pages/ProjectPage'
import { Button } from './components/ui/Button'

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Compass className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">Halaman tidak ditemukan</h1>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">
        Tautan yang Anda buka tidak tersedia, atau proyeknya sudah dihapus.
      </p>
      <Link to="/" className="mt-5">
        <Button size="sm">Kembali ke dashboard</Button>
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="projects/:projectId" element={<ProjectPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
