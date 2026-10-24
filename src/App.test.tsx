import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { useAppStore } from './store/useAppStore'

describe('alur utama aplikasi', () => {
  it('menampilkan proyek contoh dan mengelola tugas, anggota, serta kalender', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Proyek pengembangan' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Aplikasi Kasir Nusantara')).toBeInTheDocument()

    await user.click(
      screen.getByRole('link', { name: 'Aplikasi Kasir Nusantara' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Aplikasi Kasir Nusantara' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gantt Chart/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByText('Analisis Kebutuhan')).toBeInTheDocument()

    // Tambah tugas baru dari halaman Gantt.
    await user.click(screen.getAllByRole('button', { name: /Tugas baru/ })[0])
    const taskDialog = await screen.findByRole('dialog')
    await user.type(within(taskDialog).getByLabelText(/Nama kegiatan/), 'Rapat kickoff')
    await user.click(within(taskDialog).getByRole('button', { name: 'Tambah tugas' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getAllByText('Rapat kickoff').length).toBeGreaterThan(0)
    await waitFor(() => {
      const saved = useAppStore
        .getState()
        .projects.find((project) => project.name === 'Aplikasi Kasir Nusantara')
      expect(saved?.tasks.some((task) => task.name === 'Rapat kickoff')).toBe(true)
      expect(localStorage.getItem('jadwalsdlc-v1')).toContain('Rapat kickoff')
    })

    // Ubah tugas dan tambahkan dependensi Finish-to-Start.
    await user.click(screen.getByTitle('Ubah Rapat kickoff'))
    const editTaskDialog = await screen.findByRole('dialog')
    const predecessorSelect = within(editTaskDialog).getByLabelText(
      'Pilih tugas pendahulu',
    )
    const predecessorOption = within(editTaskDialog).getByRole('option', {
      name: 'Wawancara & observasi pengguna',
    })
    await user.selectOptions(predecessorSelect, predecessorOption)
    await user.click(within(editTaskDialog).getByRole('button', { name: 'Tambah' }))
    expect(
      within(editTaskDialog).getByText('Wawancara & observasi pengguna'),
    ).toBeInTheDocument()
    await user.click(
      within(editTaskDialog).getByRole('button', { name: 'Simpan perubahan' }),
    )

    await waitFor(() => {
      const saved = useAppStore
        .getState()
        .projects.find((project) => project.name === 'Aplikasi Kasir Nusantara')
      const kickoff = saved?.tasks.find((task) => task.name === 'Rapat kickoff')
      expect(kickoff?.dependencies).toHaveLength(1)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Tabel jadwal.
    await user.click(screen.getByRole('button', { name: /^Jadwal/ }))
    expect(
      await screen.findByRole('heading', { name: 'Informasi jadwal proyek' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Penanggung jawab' })).toBeInTheDocument()

    // Tambah anggota tim.
    await user.click(screen.getByRole('button', { name: /^Tim/ }))
    await user.click(screen.getByRole('button', { name: 'Tambah anggota' }))
    const memberDialog = await screen.findByRole('dialog')
    await user.type(within(memberDialog).getByLabelText(/Nama lengkap/), 'Maya Putri')
    await user.type(within(memberDialog).getByLabelText('Email'), 'maya@contoh.id')
    await user.type(within(memberDialog).getByLabelText('Peran'), 'Business Analyst')
    await user.click(within(memberDialog).getByRole('button', { name: 'Tambah anggota' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Maya Putri')).toBeInTheDocument()

    // Kalender kerja: aktifkan Sabtu.
    await user.click(screen.getByRole('button', { name: /^Kalender Kerja/ }))
    await user.click(screen.getByTitle('Aktifkan Sabtu'))

    const projectId = useAppStore.getState().projects.find(
      (project) => project.name === 'Aplikasi Kasir Nusantara',
    )?.id
    await waitFor(() => {
      const project = useAppStore
        .getState()
        .projects.find((item) => item.id === projectId)
      expect(project?.calendar.workDays).toContain(6)
    })

    // Tambah hari libur khusus.
    fireEvent.change(screen.getByLabelText('Tanggal'), {
      target: { value: '2026-12-24' },
    })
    await user.type(screen.getByLabelText('Nama libur'), 'Cuti bersama')
    await user.click(screen.getByRole('button', { name: /Tambah hari libur/ }))
    expect(await screen.findByText('Cuti bersama')).toBeInTheDocument()
    await waitFor(() => {
      const project = useAppStore
        .getState()
        .projects.find((item) => item.id === projectId)
      expect(
        project?.calendar.holidays.some((holiday) => holiday.name === 'Cuti bersama'),
      ).toBe(true)
    })
  }, 30_000)

  it('membuat, mengubah, menduplikasi, dan menghapus proyek', async () => {
    const user = userEvent.setup()
    useAppStore.setState({ projects: [] })
    localStorage.clear()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Belum ada proyek')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Buat proyek pertama/ }))

    const createDialog = await screen.findByRole('dialog')
    await user.type(
      within(createDialog).getByLabelText(/Nama proyek/),
      'Proyek Alpha',
    )
    await user.type(
      within(createDialog).getByLabelText(/Organisasi/),
      'PT Alpha Digital',
    )
    await user.click(within(createDialog).getByRole('button', { name: 'Buat proyek' }))

    expect(
      await screen.findByRole('heading', { name: 'Proyek Alpha' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Belum ada tugas untuk dijadwalkan'),
    ).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: 'Dashboard' })[0])
    expect(await screen.findByRole('link', { name: 'Proyek Alpha' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Aksi untuk Proyek Alpha' }))
    await user.click(screen.getByRole('menuitem', { name: 'Ubah informasi' }))
    const editDialog = await screen.findByRole('dialog')
    const nameInput = within(editDialog).getByLabelText(/Nama proyek/)
    await user.clear(nameInput)
    await user.type(nameInput, 'Proyek Beta')
    await user.click(
      within(editDialog).getByRole('button', { name: 'Simpan perubahan' }),
    )

    expect(await screen.findByRole('link', { name: 'Proyek Beta' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Aksi untuk Proyek Beta' }))
    await user.click(screen.getByRole('menuitem', { name: 'Duplikat proyek' }))
    expect(
      await screen.findByRole('link', { name: 'Proyek Beta (salinan)' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Aksi untuk Proyek Beta (salinan)' }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Hapus proyek' }))
    const confirm = await screen.findByRole('dialog')
    await user.click(within(confirm).getByRole('button', { name: 'Ya, hapus proyek' }))

    await waitFor(() => {
      expect(
        screen.queryByRole('link', { name: 'Proyek Beta (salinan)' }),
      ).not.toBeInTheDocument()
    })
    expect(useAppStore.getState().projects).toHaveLength(1)
  }, 30_000)
})
